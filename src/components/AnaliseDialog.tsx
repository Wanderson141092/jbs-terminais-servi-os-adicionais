import { useState, useEffect, useMemo } from "react";
import { formatTipoCarga } from "@/lib/tipoCarga";
import { buildNotificarStatusPayload } from "@/lib/edgePayload";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertTriangle, FileText, Package, User, Calendar, Clock, Download, Eye, Check, X, DollarSign, MessageSquare, History, ToggleRight, Ban, Key, Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from "./StatusBadge";
import BillingConfirmDialog from "./BillingConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeFormValue } from "@/lib/normalizeFormValue";

interface AnaliseDialogProps {
  solicitacao: any;
  profile: { id: string; nome: string; setor: "COMEX" | "ARMAZEM" | null; email: string; perfis?: string[] };
  userId: string;
  isAdmin?: boolean;
  onClose: () => void;
}

interface ServicoConfig {
  id: string;
  nome: string;
  tipo_agendamento: string | null;
  anexos_embutidos: boolean | null;
  aprovacao_ativada?: boolean;
  status_confirmacao_lancamento?: string[];
  deferimento_status_ativacao?: string[];
  deferimento_pendencias_ativacao?: string[];
  lacre_armador_status_ativacao?: string[];
  lacre_armador_pendencias_ativacao?: string[];
}

interface ObservacaoHistorico {
  id: string;
  observacao: string;
  status_no_momento: string;
  autor_nome: string | null;
  created_at: string;
  tipo_observacao?: string;
}

interface CampoFixoConfig {
  campo_chave: string;
  campo_label: string;
  ordem: number;
  servico_ids: string[];
  visivel_analise: boolean;
}

interface CampoAnaliseConfig {
  id: string;
  nome: string;
  ordem: number;
  servico_ids: string[];
  visivel_externo: boolean;
}

interface CampoAnaliseValor {
  campo_id: string;
  valor: string | null;
}

interface PerguntaMapeamento {
  pergunta_id: string;
  campo_solicitacao: string;
  campo_analise_id?: string | null;
}

interface CampoResolvido {
  key: string;
  label: string;
  valor: string;
  ordem: number;
}

const toDisplayValue = (valor: unknown) => {
  if (valor === undefined || valor === null || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor);
};

const resolveCamposExibicao = ({
  solicitacao,
  servicoId,
  isExternalForm,
  camposFixosConfig,
  camposAnaliseConfig,
  camposAnaliseValores,
  mapeamentos,
}: {
  solicitacao: any;
  servicoId?: string;
  isExternalForm: boolean;
  camposFixosConfig: CampoFixoConfig[];
  camposAnaliseConfig: CampoAnaliseConfig[];
  camposAnaliseValores: CampoAnaliseValor[];
  mapeamentos: PerguntaMapeamento[];
}): CampoResolvido[] => {
  const campoAnaliseValorMap = new Map<string, string | null>(
    camposAnaliseValores.map((cv) => [cv.campo_id, cv.valor])
  );
  const camposAnaliseMapeados = new Set(
    mapeamentos.filter((m) => !!m.campo_analise_id).map((m) => m.campo_analise_id as string)
  );

  const fixos = camposFixosConfig
    .filter((cf) => cf.visivel_analise)
    .filter((cf) => cf.servico_ids.length === 0 || (servicoId && cf.servico_ids.includes(servicoId)))
    .map((cf) => ({
      key: `fixo:${cf.campo_chave}`,
      label: cf.campo_label,
      valor: toDisplayValue((solicitacao as any)[cf.campo_chave]),
      ordem: cf.ordem,
    }));

  const dinamicos = camposAnaliseConfig
    .filter((ca) => ca.servico_ids.length === 0 || (servicoId && ca.servico_ids.includes(servicoId)))
    .filter((ca) => {
      if (!isExternalForm) return true;
      return camposAnaliseMapeados.has(ca.id) || campoAnaliseValorMap.has(ca.id) || ca.visivel_externo;
    })
    .map((ca) => ({
      key: `dinamico:${ca.id}`,
      label: ca.nome,
      valor: toDisplayValue(campoAnaliseValorMap.get(ca.id)),
      ordem: ca.ordem,
    }));

  return [...fixos, ...dinamicos].sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return a.label.localeCompare(b.label);
  });
};

const AnaliseDialog = ({ solicitacao, profile, userId, isAdmin = false, onClose }: AnaliseDialogProps) => {
  const [justificativa, setJustificativa] = useState("");
  const [showRecusaConfirm, setShowRecusaConfirm] = useState(false);
  const [showAlteracaoConfirm, setShowAlteracaoConfirm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(solicitacao.status || "");
  const [loading, setLoading] = useState(false);
  const [adminSelectedSetor, setAdminSelectedSetor] = useState<"COMEX" | "ARMAZEM" | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showDeferimentoAction, setShowDeferimentoAction] = useState<string | null>(null);
  const [motivoRecusaDeferimento, setMotivoRecusaDeferimento] = useState("");
  const [showLancamentoDialog, setShowLancamentoDialog] = useState(false);
  const [servicoConfig, setServicoConfig] = useState<ServicoConfig | null>(null);
  const [servicos, setServicos] = useState<any[]>([]);
  const [observacaoTexto, setObservacaoTexto] = useState("");
  const [observacaoTipo, setObservacaoTipo] = useState<"interna" | "externa">("interna");
  const [observacaoHistorico, setObservacaoHistorico] = useState<ObservacaoHistorico[]>([]);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [statusOrdemMap, setStatusOrdemMap] = useState<Record<string, number>>({});
  const [pendenciaOpcoes, setPendenciaOpcoes] = useState<any[]>([]);
  const [pendenciasSelecionadas, setPendenciasSelecionadas] = useState<string[]>([]);
  const [solicitarDeferimento, setSolicitarDeferimento] = useState(false);
  const [solicitarLacreArmador, setSolicitarLacreArmador] = useState(false);
  const [custoLacreArmador, setCustoLacreArmador] = useState<boolean | null>(null);
  const [showJustificativaNaoVistoriado, setShowJustificativaNaoVistoriado] = useState(false);
  const [justificativaNaoVistoriado, setJustificativaNaoVistoriado] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCnpj, setClienteCnpj] = useState("");
  const [camposExibicao, setCamposExibicao] = useState<CampoResolvido[]>([]);
  const [custoposicionamento, setCustoposicionamento] = useState<boolean | null>(solicitacao.custo_posicionamento ?? null);
  const [cancelRecusaConfig, setCancelRecusaConfig] = useState<any[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRecusarDialog, setShowRecusarDialog] = useState(false);
  const [cancelJustificativa, setCancelJustificativa] = useState("");
  const [showConclusaoLancamentoDialog, setShowConclusaoLancamentoDialog] = useState(false);
  const [cobrancaConfigs, setCobrancaConfigs] = useState<any[]>([]);
  const [lancamentoRegistros, setLancamentoRegistros] = useState<any[]>([]);
  const [billingDialogData, setBillingDialogData] = useState<{ config: any } | null>(null);
  const [blockedBillingConfig, setBlockedBillingConfig] = useState<any | null>(null);
  const [formRespostas, setFormRespostas] = useState<{ rotulo: string; valor: any; tipo: string }[]>([]);
  const [formArquivos, setFormArquivos] = useState<{ pergunta_id: string; file_url: string; file_name: string }[]>([]);
  const [isExternalForm, setIsExternalForm] = useState(false);
  const [camposFixos, setCamposFixos] = useState<{ campo_chave: string; campo_label: string; ordem: number }[]>([]);

  const getStructuredError = (fallback: string, payload: any) => {
    if (payload?.error?.message) return payload.error.message as string;
    if (payload?.message) return payload.message as string;
    return fallback;
  };

  const fetchCobrancaRegistros = async () => {
    const { data } = await supabase
      .from("lancamento_cobranca_registros")
      .select("*")
      .eq("solicitacao_id", solicitacao.id);
    return data || [];
  };

  const upsertCobrancaRegistro = async (payload: any) => {
    await supabase.from("lancamento_cobranca_registros").upsert(payload, { onConflict: "solicitacao_id,cobranca_config_id" });
  };

  useEffect(() => {
    const fetchData = async () => {
      const [servicoRes, allServicosRes, statusRes, pendenciaRes, camposValoresRes, cancelConfigRes, cobrancaConfigRes, camposFixosRes, camposAnaliseRes] = await Promise.all([
        supabase.from("servicos").select("*").eq("nome", solicitacao.tipo_operacao || "Posicionamento").maybeSingle(),
        supabase.from("servicos").select("*, status_confirmacao_lancamento").eq("ativo", true),
        supabase.from("parametros_campos").select("*").eq("grupo", "status_processo").eq("ativo", true).order("ordem"),
        supabase.from("parametros_campos").select("*").eq("grupo", "pendencia_opcoes").eq("ativo", true).order("ordem"),
        supabase.from("campos_analise_valores").select("campo_id, valor").eq("solicitacao_id", solicitacao.id),
        supabase.from("cancelamento_recusa_config").select("*").eq("ativo", true),
        supabase.from("lancamento_cobranca_config").select("*").eq("ativo", true).order("created_at"),
        supabase.from("campos_fixos_config").select("campo_chave, campo_label, ordem, servico_ids, visivel_analise").eq("ativo", true).eq("visivel_analise", true).order("ordem"),
        supabase.from("campos_analise").select("id, nome, ordem, servico_ids, visivel_externo").eq("ativo", true).order("ordem"),
      ]);

      if (servicoRes.data) setServicoConfig(servicoRes.data);
      setServicos(allServicosRes.data || []);
      setSolicitarDeferimento(solicitacao.solicitar_deferimento || false);
      setSolicitarLacreArmador(solicitacao.solicitar_lacre_armador || false);
      setCustoLacreArmador(solicitacao.lacre_armador_aceite_custo ?? null);
      setClienteNome(solicitacao.cliente_nome || "");
      setClienteCnpj(solicitacao.cnpj || "");
      
      // Filter status options by service - use ONLY options from parametros_campos
      const currentServicoId = servicoRes.data?.id;
      const filteredStatus = (statusRes.data || []).filter((s: any) => 
        s.servico_ids.length === 0 || (currentServicoId && s.servico_ids.includes(currentServicoId))
      );
      
      // Map sigla (DB enum value) -> valor (display label)
      const dynamicOptions = filteredStatus.map((s: any) => ({
        value: s.sigla || s.valor.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        label: s.valor,
        ordem: s.ordem,
        tipo_resultado: s.tipo_resultado || 'neutro'
      }));
      
      // Build ordem map
      const ordemMap: Record<string, number> = {};
      dynamicOptions.forEach((opt: any) => { ordemMap[opt.value] = opt.ordem; });
      setStatusOrdemMap(ordemMap);
      
      // Filter out cancelado and recusado, and dedup by value (same sigla = same status)
      const seen = new Set<string>();
      const filteredOptions = dynamicOptions.filter((opt: any) => {
        if (opt.value === 'cancelado' || opt.value === 'recusado') return false;
        if (seen.has(opt.value)) return false;
        seen.add(opt.value);
        return true;
      });
      
      setStatusOptions(filteredOptions);
      setPendenciaOpcoes(pendenciaRes.data || []);
      setPendenciasSelecionadas(solicitacao.pendencias_selecionadas || []);
      
      // Store cancel/recusa config filtered by service
      const allCancelConfig = (cancelConfigRes.data || []) as any[];
      const serviceCancelConfig = currentServicoId 
        ? allCancelConfig.filter((c: any) => c.servico_ids.length === 0 || c.servico_ids.includes(currentServicoId))
        : [];
      setCancelRecusaConfig(serviceCancelConfig);

      // Store billing configs filtered by service
      const allCobrancaConfig = (cobrancaConfigRes.data || []) as any[];
      const serviceCobrancaConfig = currentServicoId
        ? allCobrancaConfig.filter((c: any) => c.servico_ids.length === 0 || c.servico_ids.includes(currentServicoId))
        : allCobrancaConfig.filter((c: any) => c.servico_ids.length === 0);
      setCobrancaConfigs(serviceCobrancaConfig);

      // Fetch billing registros separately
      const registrosData = await fetchCobrancaRegistros();
      setLancamentoRegistros(registrosData);

      // Filter campos fixos by service
      const filteredCamposFixos = (camposFixosRes.data || [])
        .filter((cf: any) => cf.servico_ids.length === 0 || (currentServicoId && cf.servico_ids.includes(currentServicoId)))
        .map((cf: any) => ({ campo_chave: cf.campo_chave, campo_label: cf.campo_label, ordem: cf.ordem }));
      setCamposFixos(filteredCamposFixos);
      let mapeamentosFormulario: PerguntaMapeamento[] = [];
      let externalForm = false;


      // Consultas auxiliares: anexos e histórico somente após a carga principal
      const [attachRes, histRes] = await Promise.all([
        supabase.from("deferimento_documents").select("*").eq("solicitacao_id", solicitacao.id).neq("document_type", "deferimento"),
        supabase.from("observacao_historico").select("*").eq("solicitacao_id", solicitacao.id).order("created_at", { ascending: false }),
      ]);
      setAttachments(attachRes.data || []);
      setObservacaoHistorico((histRes.data as ObservacaoHistorico[]) || []);

      // Fetch form responses and attachments
      const formularioId = solicitacao.formulario_id;
      if (formularioId) {
        // Check if external form
        const { data: extBtn } = await supabase
          .from("external_buttons")
          .select("id, tipo")
          .eq("formulario_id", formularioId)
          .maybeSingle();
        externalForm = !!extBtn;
        setIsExternalForm(externalForm);

        // Fetch form responses
        const { data: respostasData } = await supabase
          .from("form_data")
          .select("respostas, arquivos, created_at")
          .eq("formulario_id", formularioId)
          .order("created_at", { ascending: false })
          .limit(10);

        const respostas = (respostasData && respostasData.length > 0)
          ? respostasData
          : (await supabase
            .from("formulario_respostas")
            .select("respostas, arquivos, created_at")
            .eq("formulario_id", formularioId)
            .order("created_at", { ascending: false })
            .limit(10)).data;

        const { data: perguntasNewData } = await supabase
          .from("form_field_mapping")
          .select("form_field_id, ordem, form_fields(id, rotulo, tipo)")
          .eq("formulario_id", formularioId)
          .order("ordem");

        const perguntasData = (perguntasNewData && perguntasNewData.length > 0)
          ? perguntasNewData.map((p: any) => ({ pergunta_id: p.form_field_id, ordem: p.ordem, banco_perguntas: p.form_fields }))
          : (await supabase
            .from("formulario_perguntas")
            .select("pergunta_id, ordem, banco_perguntas(id, rotulo, tipo)")
            .eq("formulario_id", formularioId)
            .order("ordem")).data;

        const { data: mapeamentos } = await supabase
          .from("pergunta_mapeamento")
          .select("pergunta_id, campo_solicitacao, campo_analise_id")
          .eq("formulario_id", formularioId);
        mapeamentosFormulario = (mapeamentos || []) as PerguntaMapeamento[];

        if (respostas && respostas.length > 0 && perguntasData) {
          // Find response closest to solicitacao creation time
          const solCreatedAt = new Date(solicitacao.created_at).getTime();
          let bestResponse = respostas[0];
          let bestDiff = Math.abs(new Date(respostas[0].created_at).getTime() - solCreatedAt);
          for (const r of respostas) {
            const diff = Math.abs(new Date(r.created_at).getTime() - solCreatedAt);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestResponse = r;
            }
          }

          const respostasObj = bestResponse.respostas as Record<string, any>;
          const mappedPerguntaIds = new Set((mapeamentos || []).map((m: any) => m.pergunta_id));

          // For internal forms: show ALL responses (unmapped)
          // For external/iframe forms: mapped ones go to dynamic fields, show unmapped here
          const allResponses: { rotulo: string; valor: any; tipo: string }[] = [];
          for (const fp of perguntasData) {
            const bp = (fp as any).banco_perguntas;
            if (!bp) continue;
            if (bp.tipo === "informativo" || bp.tipo === "subtitulo") continue;
            // For external forms, skip mapped questions (they show in Campos de Análise)
            if (externalForm && mappedPerguntaIds.has(bp.id)) continue;

            const val = respostasObj[bp.id];
            if (val !== undefined && val !== null && val !== "") {
              allResponses.push({ rotulo: bp.rotulo, valor: val, tipo: bp.tipo });
            }
          }
          setFormRespostas(allResponses);

          // Process attachments with signed URLs
          const rawArquivos = (bestResponse.arquivos as any[]) || [];
          const signedArquivos: { pergunta_id: string; file_url: string; file_name: string }[] = [];
          for (const arq of rawArquivos) {
            let signedUrl = arq.file_url;
            // Generate signed URL if it's a storage path (not already a full URL)
            if (arq.file_url && !arq.file_url.startsWith("http")) {
              const { data: signedData } = await supabase.storage
                .from("form-uploads")
                .createSignedUrl(arq.file_url, 3600);
              if (signedData) signedUrl = signedData.signedUrl;
            } else if (arq.file_url && arq.file_url.includes("/storage/v1/object/public/form-uploads/")) {
              const pathMatch = arq.file_url.split("/storage/v1/object/public/form-uploads/");
              if (pathMatch.length === 2) {
                const storagePath = decodeURIComponent(pathMatch[1]);
                const { data: signedData } = await supabase.storage
                  .from("form-uploads")
                  .createSignedUrl(storagePath, 3600);
                if (signedData) signedUrl = signedData.signedUrl;
              }
            }
            signedArquivos.push({
              pergunta_id: arq.pergunta_id || arq.campo_id || "",
              file_url: signedUrl,
              file_name: arq.file_name || "Arquivo",
            });
          }
          setFormArquivos(signedArquivos);
        } else {
          setFormRespostas([]);
          setFormArquivos([]);
        }
      } else {
        setIsExternalForm(false);
        setFormRespostas([]);
        setFormArquivos([]);
      }

      const camposResolvidos = resolveCamposExibicao({
        solicitacao,
        servicoId: currentServicoId,
        isExternalForm: externalForm,
        camposFixosConfig: (camposFixosRes.data || []) as CampoFixoConfig[],
        camposAnaliseConfig: (camposAnaliseRes.data || []) as CampoAnaliseConfig[],
        camposAnaliseValores: (camposValoresRes.data || []) as CampoAnaliseValor[],
        mapeamentos: mapeamentosFormulario,
      });
      setCamposExibicao(camposResolvidos);
    };
    
    fetchData();
  }, [solicitacao.id, solicitacao.tipo_operacao]);

  const setor = isAdmin ? adminSelectedSetor : profile.setor;
  const isComex = setor === "COMEX";
  const isArmazem = setor === "ARMAZEM";

  const comexPending = solicitacao.comex_aprovado === null;
  const armazemPending = solicitacao.armazem_aprovado === null;

  const currentApproval = isComex ? solicitacao.comex_aprovado : isArmazem ? solicitacao.armazem_aprovado : null;
  const wasRefused = currentApproval === false;
  const alreadyApproved = currentApproval === true;

  // Use approval flag from service config
  const approvalRequired = servicoConfig?.aprovacao_ativada !== false; // Default true if undefined
  
  const canDecide = approvalRequired && (solicitacao.status === "aguardando_confirmacao" || (solicitacao.status === "recusado" && currentApproval === null)) && !alreadyApproved && setor !== null;
  const canChangeRefusal = approvalRequired && wasRefused;

  // Determinar labels de data baseado no serviço
  const isPositionamento = (solicitacao.tipo_operacao || "").toLowerCase().includes("posicionamento");
  const isAgendamento = servicoConfig?.tipo_agendamento === "data_horario";
  
  const getDateLabel = () => {
    if (isPositionamento) return "Posicionar dia";
    if (isAgendamento) return "Agendar para";
    return "Data do serviço";
  };

  const showEmbeddedPreview = servicoConfig?.anexos_embutidos ?? true;

  const handleAprovar = async () => {
    if (wasRefused) {
      if (!justificativa.trim()) {
        toast.error("Justificativa obrigatória para alterar de recusado para aprovado.");
        return;
      }
      if (justificativa.trim().length < 10) {
        toast.error("Justificativa deve ter pelo menos 10 caracteres.");
        return;
      }
      setShowAlteracaoConfirm(true);
      return;
    }
    await executeApproval(true);
  };

  const handleRecusar = async () => {
    if (!justificativa.trim()) {
      toast.error("Justificativa é obrigatória para recusa.");
      return;
    }
    if (justificativa.trim().length < 10) {
      toast.error("Justificativa deve ter pelo menos 10 caracteres.");
      return;
    }
    setShowRecusaConfirm(true);
  };

  const executeApproval = async (aprovado: boolean) => {
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("request_process_transition", {
      body: {
        solicitacao_id: solicitacao.id,
        current_status: solicitacao.status,
        actor_setor: isAdmin ? adminSelectedSetor : profile.setor,
        approval_decision: aprovado,
        approval_justificativa: justificativa.trim() || null,
      },
    });

    if (error || data?.ok === false) {
      toast.error(getStructuredError("Erro ao salvar decisão.", data) + (error?.message ? ` ${error.message}` : ""));
      setLoading(false);
      return;
    }

    toast.success(aprovado ? "Aprovação registrada!" : "Recusa registrada!");
    setLoading(false);
    onClose();
  };

  const confirmRecusa = async () => {
    setShowRecusaConfirm(false);
    await executeApproval(false);
  };

  const confirmAlteracao = async () => {
    setShowAlteracaoConfirm(false);
    await executeApproval(true);
  };

  // Check if this is a late cancellation requiring cost validation
  const isLateCancel = (status: string): boolean => {
    const isPosic = servicoConfig?.nome?.toLowerCase().includes("posicionamento");
    return isPosic === true && status === "cancelado" && 
      (solicitacao.status === "confirmado_aguardando_vistoria");
  };

  // Determine if cancel/refuse buttons should be enabled based on config
  const canCancelDireto = cancelRecusaConfig.some(
    (c: any) => c.tipo === "cancelamento_direto" && c.status_habilitados.includes(solicitacao.status)
  );
  const canCancelConfirmacao = cancelRecusaConfig.some(
    (c: any) => c.tipo === "cancelamento_confirmacao" && c.status_habilitados.includes(solicitacao.status)
  );
  const canRecusar = cancelRecusaConfig.some(
    (c: any) => c.tipo === "recusa" && c.status_habilitados.includes(solicitacao.status)
  );
  const canCancel = canCancelDireto || canCancelConfirmacao;

  const handleCancelarClick = () => {
    setCustoposicionamento(null);
    setCancelJustificativa("");
    setShowCancelDialog(true);
  };

  const handleRecusarClick = () => {
    setCancelJustificativa("");
    setShowRecusarDialog(true);
  };

  const executeCancelamento = async () => {
    if (canCancelConfirmacao && !canCancelDireto && custoposicionamento === null) {
      toast.error("Informe se há cobrança de posicionamento antes de salvar.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("request_process_transition", {
      body: {
        solicitacao_id: solicitacao.id,
        current_status: solicitacao.status,
        target_status: "cancelado",
        actor_setor: isAdmin ? adminSelectedSetor : profile.setor,
        custo_posicionamento: canCancelConfirmacao ? custoposicionamento : null,
        justification: cancelJustificativa.trim() || null,
      },
    });

    if (error || data?.ok === false) {
      toast.error(getStructuredError("Erro ao cancelar.", data) + (error?.message ? ` ${error.message}` : ""));
      setLoading(false);
      return;
    }

    let details = `Status atualizado para: Cancelado`;
    if (canCancelConfirmacao) {
      details += `. Cancelamento com confirmação interna. Cobrança de posicionamento: ${custoposicionamento ? "Sim" : "Não"}`;
      if (custoposicionamento === true) {
        details += `. Lançamento financeiro ativado.`;
      }
    } else {
      details += `. Cancelamento direto (pelo cliente).`;
    }
    if (cancelJustificativa.trim()) {
      details += ` Justificativa: ${cancelJustificativa.trim()}`;
    }

    await logAudit("status_atualizado", details);
    await createNotification(`Solicitação ${solicitacao.protocolo} cancelada`, "status");
    supabase.functions.invoke("notificar-status", {
      body: buildNotificarStatusPayload({
        action: "notificar_status",
        solicitacao_id: solicitacao.id,
        novo_status: "cancelado",
        usuario_id: userId,
      }),
    }).catch(() => {});

    toast.success("Cancelamento realizado!");
    setLoading(false);
    setShowCancelDialog(false);
    onClose();
  };

  const executeRecusa = async () => {
    if (!cancelJustificativa.trim() || cancelJustificativa.trim().length < 10) {
      toast.error("Justificativa obrigatória (mínimo 10 caracteres).");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("request_process_transition", {
      body: {
        solicitacao_id: solicitacao.id,
        current_status: solicitacao.status,
        target_status: "recusado",
        actor_setor: isAdmin ? adminSelectedSetor : profile.setor,
        justification: cancelJustificativa.trim(),
      },
    });

    if (error || data?.ok === false) {
      toast.error(getStructuredError("Erro ao recusar.", data) + (error?.message ? ` ${error.message}` : ""));
      setLoading(false);
      return;
    }

    // Gravar motivo da recusa como observação EXTERNA (visível na consulta pública)
    await supabase.from("observacao_historico").insert({
      solicitacao_id: solicitacao.id,
      observacao: cancelJustificativa.trim(),
      status_no_momento: "recusado",
      autor_id: userId,
      autor_nome: profile.nome || profile.email,
      tipo_observacao: "externa",
    });

    const details = `Status atualizado para: Recusado. Justificativa: ${cancelJustificativa.trim()}`;
    await logAudit("status_atualizado", details);
    await createNotification(`Solicitação ${solicitacao.protocolo} recusada: ${cancelJustificativa.trim()}`, "status");
    supabase.functions.invoke("notificar-status", {
      body: buildNotificarStatusPayload({
        action: "notificar_status",
        solicitacao_id: solicitacao.id,
        novo_status: "recusado",
        usuario_id: userId,
      }),
    }).catch(() => {});

    toast.success("Recusa registrada!");
    setLoading(false);
    setShowRecusarDialog(false);
    onClose();
  };

  // Check if the selected status requires financial launch confirmation
  const isCompletionStatus = () => {
    if (!servicoConfig?.status_confirmacao_lancamento?.length) return false;
    return servicoConfig.status_confirmacao_lancamento.includes(selectedStatus);
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;

    // Validação PRIORITÁRIA: Vistoriado com Pendência requer ao menos uma pendência
    if (selectedStatus === "vistoriado_com_pendencia" && pendenciasSelecionadas.length === 0) {
      toast.error("Obrigatório selecionar uma das pendências.");
      return;
    }

    // Validação: status não conforme requer justificativa (motivo)
    const selectedOpt = statusOptions.find((s: any) => s.value === selectedStatus);
    if (selectedOpt?.tipo_resultado === "nao_conforme" && !justificativaNaoVistoriado.trim()) {
      setShowJustificativaNaoVistoriado(true);
      return;
    }

    if (selectedStatus === solicitacao.status && 
        solicitarDeferimento === solicitacao.solicitar_deferimento && 
        solicitarLacreArmador === solicitacao.solicitar_lacre_armador &&
        custoLacreArmador === (solicitacao.lacre_armador_aceite_custo ?? null) &&
        JSON.stringify(pendenciasSelecionadas) === JSON.stringify(solicitacao.pendencias_selecionadas)) {
      toast.info("Nenhuma alteração detectada.");
      return;
    }

    // Validação: se lacre armador ativado, exigir resposta sobre cobrança
    if (solicitarLacreArmador && custoLacreArmador === null) {
      toast.error("Informe se há cobrança de serviço para o lacre armador antes de salvar.");
      return;
    }
    
    // Validação: cancelamento pós-confirmação requer resposta sobre cobrança
    if (isLateCancel(selectedStatus) && custoposicionamento === null) {
      toast.error("Informe se há cobrança de posicionamento antes de salvar.");
      return;
    }
    
    // Validação: só permite mudança de status de vistoria se ambos aprovaram (se aprovação for ativada)
    const bothApproved = solicitacao.comex_aprovado === true && solicitacao.armazem_aprovado === true;
    const vistoriaStatuses = ["vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado"];
    
    if (approvalRequired && vistoriaStatuses.includes(selectedStatus) && !bothApproved) {
      toast.error("Ambos os setores (Administrativo e Operacional) devem aprovar antes de alterar para este status.");
      return;
    }

    // Validação: se deferimento está ativo, só permite vistoria_finalizada se deferimento foi recebido
    if (solicitarDeferimento && selectedStatus === "vistoria_finalizada") {
      const { data: defDocs } = await supabase
        .from("deferimento_documents")
        .select("status")
        .eq("solicitacao_id", solicitacao.id)
        .eq("document_type", "deferimento");
      
      const allAceitos = defDocs && defDocs.length > 0 && defDocs.every(d => d.status === "aceito");
      if (!allAceitos) {
        toast.error("O deferimento precisa estar com status 'Recebido' antes de finalizar a vistoria.");
        return;
      }
    }

    // If this is a completion status, show the financial launch confirmation dialog first
    if (isCompletionStatus() && selectedStatus !== solicitacao.status) {
      setShowConclusaoLancamentoDialog(true);
      return;
    }
    
    await executeSaveStatus(false);
  };

  const executeSaveStatus = async (lancamentoConfirmado: boolean) => {
    setShowConclusaoLancamentoDialog(false);
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("request_process_transition", {
      body: {
        solicitacao_id: solicitacao.id,
        current_status: solicitacao.status,
        target_status: selectedStatus,
        actor_setor: isAdmin ? adminSelectedSetor : profile.setor,
        selected_pendencias: pendenciasSelecionadas,
        solicitar_deferimento: solicitarDeferimento,
        solicitar_lacre_armador: solicitarLacreArmador,
        lacre_armador_aceite_custo: solicitarLacreArmador ? custoLacreArmador : null,
        custo_posicionamento: isLateCancel(selectedStatus) ? custoposicionamento : null,
        lancamento_confirmado: lancamentoConfirmado,
        cliente_nome: clienteNome.trim(),
        cnpj: clienteCnpj.trim() || null,
        justification: justificativaNaoVistoriado.trim() || null,
      },
    });
    
    let statusVistoria: string | null = null;
    const matchedLabel = statusOptions.find(s => s.value === selectedStatus)?.label;
    if (matchedLabel) {
      statusVistoria = matchedLabel;
    }

    // Build update data
    const updatePayload: any = {
      status: selectedStatus,
      status_vistoria: statusVistoria,
      solicitar_deferimento: solicitarDeferimento,
      solicitar_lacre_armador: solicitarLacreArmador,
      lacre_armador_aceite_custo: solicitarLacreArmador ? custoLacreArmador : null,
      pendencias_selecionadas: pendenciasSelecionadas,
      cliente_nome: clienteNome.trim(),
      cnpj: clienteCnpj.trim() || null,
      updated_at: new Date().toISOString()
    };

    // If late cancellation, save custo_posicionamento and trigger lançamento if needed
    if (isLateCancel(selectedStatus)) {
      updatePayload.custo_posicionamento = custoposicionamento;
      if (custoposicionamento === true) {
        updatePayload.lancamento_confirmado = false;
      }
    }
    
    // If lacre armador with cost, create individual pendencia registro
    if (solicitarLacreArmador && custoLacreArmador === true) {
      updatePayload.lancamento_confirmado = false;
      const pendenciaCfg = cobrancaConfigs.find((c: any) => c.tipo === "pendencia");
      if (pendenciaCfg) {
        await upsertCobrancaRegistro({
          solicitacao_id: solicitacao.id,
          cobranca_config_id: pendenciaCfg.id,
          confirmado: false,
        });
      }
    }

    // If completion status, create individual servico registro and set lancamento based on user confirmation
    if (isCompletionStatus() && selectedStatus !== solicitacao.status) {
      const servicoCfg = cobrancaConfigs.find((c: any) => {
        if (c.tipo !== "servico") return false;
        const statusAtivacao = c.status_ativacao || [];
        if (statusAtivacao.length > 0 && !statusAtivacao.includes(selectedStatus)) return false;
        return true;
      });
      if (servicoCfg) {
        await upsertCobrancaRegistro({
          solicitacao_id: solicitacao.id,
          cobranca_config_id: servicoCfg.id,
          confirmado: lancamentoConfirmado,
          confirmado_por: lancamentoConfirmado ? userId : null,
          confirmado_data: lancamentoConfirmado ? new Date().toISOString() : null,
        });
      }
      // Check if ALL registros are confirmed for global field
      const allRegs = await fetchCobrancaRegistros();
      const applicableConfigs = cobrancaConfigs.filter((cfg: any) => {
        const statusAtivacao = cfg.status_ativacao || [];
        if (statusAtivacao.length > 0 && !statusAtivacao.includes(selectedStatus)) return false;
        if (cfg.tipo === "servico") return true;
        if (cfg.tipo === "pendencia") return solicitacao.lacre_armador_aceite_custo === true || (solicitarLacreArmador && custoLacreArmador === true);
        return false;
      });
      const allConfirmed = applicableConfigs.every((cfg: any) => {
        const reg = (allRegs || []).find((r: any) => r.cobranca_config_id === cfg.id);
        return reg?.confirmado === true;
      });
      updatePayload.lancamento_confirmado = allConfirmed;
      if (allConfirmed) {
        updatePayload.lancamento_confirmado_por = userId;
        updatePayload.lancamento_confirmado_data = new Date().toISOString();
      }
    }
    
    const { error } = await supabase
      .from("solicitacoes")
      .update(updatePayload)
      .eq("id", solicitacao.id);

    if (error || data?.ok === false) {
      toast.error(getStructuredError("Erro ao atualizar status.", data) + (error?.message ? ` ${error.message}` : ""));
      setLoading(false);
      return;
    }

    if (justificativaNaoVistoriado.trim()) {
      setJustificativaNaoVistoriado("");
    }

    await createNotification(`Status da solicitação ${solicitacao.protocolo} atualizado para: ${statusLabel}`, "status");
    
    // Dispatch email/notification via edge function
    supabase.functions.invoke("notificar-status", {
      body: buildNotificarStatusPayload({
        action: "notificar_status",
        solicitacao_id: solicitacao.id,
        novo_status: selectedStatus,
        usuario_id: userId,
      }),
    }).catch(() => {}); // Fire and forget
    
    toast.success("Atualização realizada com sucesso!");
    setLoading(false);
    onClose();
  };

  const handleDeferimentoDecision = async (docId: string, aceito: boolean) => {
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("resolve_pendencia", {
      body: {
        solicitacao_id: solicitacao.id,
        deferimento_document_id: docId,
        accept: aceito,
        motivo_recusa: aceito ? null : motivoRecusaDeferimento,
      },
    });

    if (error || data?.ok === false) {
      toast.error(getStructuredError("Erro ao atualizar status do deferimento.", data) + (error?.message ? ` ${error.message}` : ""));
      setLoading(false);
      return;
    }

    toast.success(aceito ? "Deferimento aceito!" : "Deferimento recusado!");
    setShowDeferimentoAction(null);
    setMotivoRecusaDeferimento("");
    setLoading(false);

    const { data: deferimentoDocs } = await supabase
      .from("deferimento_documents")
      .select("*")
      .eq("solicitacao_id", solicitacao.id)
      .eq("document_type", "deferimento");

    setAttachments(prev => {
      const nonDeferimento = prev.filter(a => a.document_type !== "deferimento");
      return [...nonDeferimento, ...(deferimentoDocs || [])];
    });
  };

  const handleConfirmarLancamento = async (configId?: string) => {
    const effectiveConfigId = configId || cobrancaConfigs.find((c: any) => {
      if (c.tipo !== "servico") return false;
      const statusAtivacao = c.status_ativacao || [];
      return statusAtivacao.length === 0 || statusAtivacao.includes(selectedStatus || solicitacao.status);
    })?.id;

    if (!effectiveConfigId) {
      toast.error("Configuração de cobrança não informada.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("confirm_billing", {
      body: {
        solicitacao_id: solicitacao.id,
        cobranca_config_id: effectiveConfigId,
        confirm: true,
      },
    });

    if (error || data?.ok === false) {
      toast.error(getStructuredError("Erro ao confirmar lançamento.", data) + (error?.message ? ` ${error.message}` : ""));
      setLoading(false);
      return;
    }
    
    if (configId) {
      // Confirm individual registro
      let error: any = null;
      try {
        await upsertCobrancaRegistro({
          solicitacao_id: solicitacao.id,
          cobranca_config_id: configId,
          confirmado: true,
          confirmado_por: userId,
          confirmado_data: new Date().toISOString(),
        });
      } catch (err) {
        error = err;
      }

      if (error) {
        toast.error("Erro ao confirmar lançamento");
        setLoading(false);
        return;
      }

      // Refresh registros
      const updatedRegistros = await fetchCobrancaRegistros();
      setLancamentoRegistros(updatedRegistros || []);

      // Check if ALL applicable registros are now confirmed
      const applicableConfigs = cobrancaConfigs.filter((cfg: any) => {
        const statusAtivacao = cfg.status_ativacao || [];
        if (statusAtivacao.length > 0 && !statusAtivacao.includes(solicitacao.status)) return false;
        if (cfg.tipo === "servico") return true;
        if (cfg.tipo === "pendencia") return solicitacao.lacre_armador_aceite_custo === true;
        return false;
      });
      const allConfirmed = applicableConfigs.every((cfg: any) => {
        const reg = (updatedRegistros || []).find((r: any) => r.cobranca_config_id === cfg.id);
        return reg?.confirmado === true;
      });

    const { data: updatedRegistros } = await supabase
      .from("lancamento_cobranca_registros")
      .select("*")
      .eq("solicitacao_id", solicitacao.id);
    setLancamentoRegistros(updatedRegistros || []);

    const cfgLabel = cobrancaConfigs.find((c: any) => c.id === effectiveConfigId)?.rotulo_analise || "Cobrança";
    toast.success(`Lançamento "${cfgLabel}" confirmado!`);
    setShowLancamentoDialog(false);
    setLoading(false);
    if (data?.data?.all_confirmed) onClose();
  };

  const handleDesfazerLancamento = async (configId: string) => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("confirm_billing", {
      body: {
        solicitacao_id: solicitacao.id,
        cobranca_config_id: configId,
        confirm: false,
      },
    });

    if (error || data?.ok === false) {
      toast.error(getStructuredError("Erro ao desfazer lançamento.", data) + (error?.message ? ` ${error.message}` : ""));
      setLoading(false);
      return;
    }

    const { data: updatedRegistros } = await supabase
      .from("lancamento_cobranca_registros")
      .select("*")
      .eq("solicitacao_id", solicitacao.id);
    setLancamentoRegistros(updatedRegistros || []);

    const cfgLabel = cobrancaConfigs.find((c: any) => c.id === configId)?.rotulo_analise || "Cobrança";
    toast.success(`Lançamento "${cfgLabel}" desfeito!`);
    setLoading(false);
  };

  const logAudit = async (acao: string, detalhes: string) => {
    await supabase.rpc("insert_audit_log", {
      p_solicitacao_id: solicitacao.id,
      p_usuario_id: userId,
      p_acao: acao,
      p_detalhes: detalhes,
    });
  };

  const createNotification = async (mensagem: string, tipo: string) => {
    await supabase.rpc("create_notifications_for_others", {
      p_solicitacao_id: solicitacao.id,
      p_mensagem: mensagem,
      p_tipo: tipo,
      p_exclude_user_id: userId,
    });
  };

  const handleSaveObservacao = async () => {
    if (!observacaoTexto.trim()) {
      toast.error("Digite uma observação");
      return;
    }
    setLoading(true);
    
    const { error: histError } = await supabase.from("observacao_historico").insert({
      solicitacao_id: solicitacao.id,
      observacao: observacaoTexto.trim(),
      status_no_momento: solicitacao.status,
      autor_id: userId,
      autor_nome: profile.nome || profile.email,
      tipo_observacao: observacaoTipo,
    });

    if (histError) {
      toast.error("Erro ao salvar observação");
      setLoading(false);
      return;
    }

    // Only update the process observacoes field when the observation is "externa" (visible to client)
    if (observacaoTipo === "externa") {
      await supabase.from("solicitacoes").update({ observacoes: observacaoTexto.trim() }).eq("id", solicitacao.id);
    }
    await logAudit("observacao", `Observação ${observacaoTipo === "externa" ? "(externa)" : "(interna)"}: ${observacaoTexto.trim()}`);

    const { data: histData } = await supabase
      .from("observacao_historico")
      .select("*")
      .eq("solicitacao_id", solicitacao.id)
      .order("created_at", { ascending: false });
    setObservacaoHistorico((histData as ObservacaoHistorico[]) || []);

    setObservacaoTexto("");
    setObservacaoTipo("interna");
    toast.success("Observação registrada!");
    setLoading(false);
  };

  const handleDesfazerLancamento = async (configId: string) => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    const [{ error: newError }, { error: legacyError }] = await Promise.all([
      supabase
        .from("cobrancas")
        .update({
          confirmado: false,
          status_financeiro: "pendente",
          confirmado_por: null,
          confirmado_data: null,
          updated_at: nowIso,
        })
        .eq("solicitacao_id", solicitacao.id)
        .eq("cobranca_config_id", configId),
      supabase
        .from("lancamento_cobranca_registros")
        .update({
          confirmado: false,
          confirmado_por: null,
          confirmado_data: null,
          updated_at: nowIso,
        })
        .eq("solicitacao_id", solicitacao.id)
        .eq("cobranca_config_id", configId),
    ]);

    const error = newError || legacyError;

    if (error) {
      toast.error("Erro ao desfazer lançamento");
      setLoading(false);
      return;
    }

    // Update global field
    await supabase.from("solicitacoes").update({
      lancamento_confirmado: false,
      lancamento_confirmado_por: null,
      lancamento_confirmado_data: null,
    }).eq("id", solicitacao.id);

    // Refresh registros
    const updatedRegistros = await fetchCobrancaRegistros();
    setLancamentoRegistros(updatedRegistros || []);

    const cfgLabel = cobrancaConfigs.find((c: any) => c.id === configId)?.rotulo_analise || "Cobrança";
    await logAudit("lancamento_desfeito", `Lançamento desfeito: ${cfgLabel}. Protocolo: ${solicitacao.protocolo}.`);
    toast.success(`Lançamento "${cfgLabel}" desfeito!`);
    setLoading(false);
  };

  const refreshLancamentoRegistros = async () => {
    const { data: updatedRegistros } = await supabase
      .from("lancamento_cobranca_registros")
      .select("*")
      .eq("solicitacao_id", solicitacao.id);
    setLancamentoRegistros(updatedRegistros || []);
  };

  const togglePendencia = (valor: string) => {
    setPendenciasSelecionadas(prev => 
      prev.includes(valor) ? prev.filter(v => v !== valor) : [...prev, valor]
    );
  };

  const formatDateValue = () => {
    if (isAgendamento && solicitacao.data_agendamento) {
      return new Date(solicitacao.data_agendamento).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
    }
    if (solicitacao.data_posicionamento) {
      return new Date(solicitacao.data_posicionamento + 'T00:00:00').toLocaleDateString("pt-BR");
    }
    return "—";
  };

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              <span>Análise — {solicitacao.protocolo}</span>
              {solicitacao.chave_consulta && (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1 ml-1">
                  <Key className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-sm font-mono font-bold text-blue-800 tracking-widest">{solicitacao.chave_consulta}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const { error } = await supabase.functions.invoke("notificar-status", {
                          body: buildNotificarStatusPayload({
                            action: "reenviar_chave",
                            solicitacao_id: solicitacao.id,
                            usuario_id: userId,
                          }),
                        });
                        if (error) throw error;
                        toast.success("Chave reenviada para o e-mail do cliente!");
                      } catch {
                        toast.error("Erro ao reenviar chave.");
                      }
                    }}
                    title="Reenviar chave por e-mail"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Análise e decisão sobre a solicitação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Alerta de Cancelamento Pendente */}
            {(solicitacao as any).cancelamento_solicitado === true && solicitacao.status !== "cancelado" && (
              <Alert className="border-amber-400 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="ml-2 text-sm text-amber-700 font-medium">
                  O cliente solicitou o cancelamento desta solicitação. Utilize o botão "Cancelar" abaixo para confirmar ou recusar.
                </AlertDescription>
              </Alert>
            )}
            {/* Campos editáveis de cliente */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Nome da Empresa
                </Label>
                <Input
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome da empresa"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> CNPJ
                </Label>
                <Input
                  value={clienteCnpj}
                  onChange={(e) => setClienteCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="h-9 text-sm"
                />
              </div>
            </div>


            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoItem icon={<Package className="h-4 w-4" />} label="Contêiner" value={solicitacao.numero_conteiner || "—"} />
              <InfoItem icon={<FileText className="h-4 w-4" />} label="LPCO" value={solicitacao.lpco || "—"} />
              <InfoItem icon={<Calendar className="h-4 w-4" />} label={getDateLabel()} value={formatDateValue()} />
              <InfoItem icon={<Clock className="h-4 w-4" />} label="Serviço Adicional" value={solicitacao.tipo_operacao || "Posicionamento"} />
              <InfoItem icon={<Package className="h-4 w-4" />} label="Tipo Carga" value={formatTipoCarga(solicitacao.tipo_carga)} />
            </div>

            {/* Campos resolvidos para exibição (fixos + análise) */}
            {camposExibicao.length > 0 && (
              <div className="grid grid-cols-2 gap-4 text-sm border rounded-lg p-3 bg-muted/20">
                <p className="col-span-2 text-xs font-semibold text-muted-foreground mb-1">Campos do Processo</p>
                {camposExibicao.map((campo) => (
                  <InfoItem key={campo.key} icon={<FileText className="h-4 w-4" />} label={campo.label} value={campo.valor} />
                ))}
              </div>
            )}

            {/* Form responses */}
            {formRespostas.length > 0 && (
              <div className="grid grid-cols-2 gap-4 text-sm border rounded-lg p-3 bg-muted/20">
                <p className="col-span-2 text-xs font-semibold text-muted-foreground mb-1">Respostas do Formulário</p>
                {formRespostas.map((fr, idx) => (
                  <InfoItem key={idx} icon={<FileText className="h-4 w-4" />} label={fr.rotulo} value={formatFormValue(fr.valor, fr.tipo)} />
                ))}
              </div>
            )}

            {/* Form file attachments - shown as buttons that open preview modal */}
            {formArquivos.length > 0 && (
              <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Anexos do Formulário
                </p>
                <div className="flex flex-wrap gap-2">
                  {formArquivos.map((arq, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setPreviewUrl(arq.file_url)}
                    >
                      <Eye className="h-4 w-4" />
                      {arq.file_name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {solicitacao.observacoes && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{solicitacao.observacoes}</p>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">Status:</span>
              <StatusBadge status={solicitacao.status} />
            </div>

            <Separator />

            {approvalRequired && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <ApprovalCard
                    label="Administrativo"
                    approved={solicitacao.comex_aprovado}
                    justificativa={solicitacao.comex_justificativa}
                    data={solicitacao.comex_data}
                    isCurrentSetor={isComex}
                  />
                  <ApprovalCard
                    label="Operacional"
                    approved={solicitacao.armazem_aprovado}
                    justificativa={solicitacao.armazem_justificativa}
                    data={solicitacao.armazem_data}
                    isCurrentSetor={isArmazem}
                  />
                </div>

                {isAdmin && solicitacao.status === "aguardando_confirmacao" && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">Administrador — Selecione o setor para atuar:</p>
                      <div className="flex gap-3">
                        <Button
                          variant={adminSelectedSetor === "COMEX" ? "default" : "outline"}
                          onClick={() => setAdminSelectedSetor("COMEX")}
                          disabled={solicitacao.comex_aprovado === true}
                          className="flex-1"
                        >
                          Administrativo {solicitacao.comex_aprovado === true && "(Aprovado)"}
                          {solicitacao.comex_aprovado === false && "(Recusado)"}
                        </Button>
                        <Button
                          variant={adminSelectedSetor === "ARMAZEM" ? "default" : "outline"}
                          onClick={() => setAdminSelectedSetor("ARMAZEM")}
                          disabled={solicitacao.armazem_aprovado === true}
                          className="flex-1"
                        >
                          Operacional {solicitacao.armazem_aprovado === true && "(Aprovado)"}
                          {solicitacao.armazem_aprovado === false && "(Recusado)"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {(canDecide || canChangeRefusal) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">
                        Sua decisão ({getSetorLabel(setor)})
                        {wasRefused && (
                          <span className="text-destructive ml-2 text-xs">(Alterando decisão anterior)</span>
                        )}
                      </p>
                      <div>
                        <Label className="text-sm">
                          {wasRefused 
                            ? "Justificativa (obrigatória para alterar para aprovado)"
                            : "Justificativa (obrigatória para recusa)"
                          }
                        </Label>
                        <Textarea
                          value={justificativa}
                          onChange={(e) => setJustificativa(e.target.value)}
                          placeholder={wasRefused 
                            ? "Informe o motivo da alteração de recusado para aprovado..."
                            : "Informe a justificativa..."
                          }
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleAprovar} 
                          disabled={loading} 
                          className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {wasRefused ? "Alterar para Aprovado" : "Aprovar"}
                        </Button>
                        {!wasRefused && (
                          <Button onClick={handleRecusar} disabled={loading} variant="destructive" className="flex-1">
                            <XCircle className="h-4 w-4 mr-2" />
                            Recusar
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Atualizar Status - disponível se aprovado ou não requer aprovação */}
            {(!approvalRequired || (solicitacao.comex_aprovado && solicitacao.armazem_aprovado)) && (
              <>
                <Separator />
                <div className="space-y-3 bg-muted/20 p-4 rounded-lg border">
                  <p className="text-sm font-semibold">Próxima Etapa:</p>
                  {(() => {
                    const currentOrdem = statusOrdemMap[solicitacao.status];
                    if (currentOrdem === undefined) {
                      return <p className="text-xs text-muted-foreground">Status atual sem ordem definida.</p>;
                    }

                    const allOrdens = [...new Set(statusOptions.map(o => o.ordem).filter((o: number | undefined) => o !== undefined && o > currentOrdem))].sort((a: number, b: number) => a - b);
                    const nextOrdem = allOrdens.length > 0 ? allOrdens[0] : null;
                    const immediateNext = nextOrdem !== null
                      ? statusOptions.filter((opt: any) => opt.ordem === nextOrdem)
                      : [];

                    if (immediateNext.length === 0) {
                      return <p className="text-xs text-muted-foreground">Não há próxima etapa disponível. Use "Corrigir Status" no dashboard se necessário.</p>;
                    }

                    return (
                      <div className="flex flex-wrap gap-2">
                        {immediateNext.map((opt: any) => {
                          const iconColorMap: Record<string, string> = {
                            conforme: "text-emerald-600",
                            nao_conforme: "text-red-600",
                            em_pendencia: "text-amber-600",
                            neutro: "text-blue-600",
                          };
                          const iconMap: Record<string, React.ReactNode> = {
                            conforme: <CheckCircle2 className={`h-3.5 w-3.5 ${iconColorMap['conforme']}`} />,
                            nao_conforme: <XCircle className={`h-3.5 w-3.5 ${iconColorMap['nao_conforme']}`} />,
                            em_pendencia: <AlertTriangle className={`h-3.5 w-3.5 ${iconColorMap['em_pendencia']}`} />,
                            neutro: <Clock className={`h-3.5 w-3.5 ${iconColorMap['neutro']}`} />,
                          };
                          const tipo = opt.tipo_resultado || 'neutro';
                          const isSelected = selectedStatus === opt.value;
                          return (
                            <Button
                              key={opt.value}
                              variant={isSelected ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => {
                                setSelectedStatus(opt.value);
                              }}
                              className={`flex items-center gap-1.5 [&_svg]:!text-current ${isSelected ? "ring-2 ring-ring font-semibold" : ""}`}
                            >
                              <span className={iconColorMap[tipo]}>{iconMap[tipo]}</span>
                              <span>{opt.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Custo de Posicionamento removed from here - now in cancel dialog */}

                  {/* Pendências Checkboxes */}
                  {selectedStatus === "vistoriado_com_pendencia" && (
                    <div className="space-y-2 border rounded-md p-3 bg-white">
                      <Label className="text-xs mb-2 block">Selecione as pendências:</Label>
                      {pendenciaOpcoes.map(op => (
                        <div key={op.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={op.id}
                            checked={pendenciasSelecionadas.includes(op.valor)}
                            onCheckedChange={() => togglePendencia(op.valor)}
                          />
                          <Label htmlFor={op.id} className="text-sm cursor-pointer font-normal">{op.valor}</Label>
                        </div>
                      ))}
                      {pendenciaOpcoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma opção cadastrada.</p>}
                    </div>
                  )}

                  {/* Solicitar Deferimento Toggle - apenas para Posicionamento e status habilitado */}
                  {(() => {
                    const isPosicionamento = servicoConfig?.nome?.toLowerCase().includes("posicionamento");
                    const defStatusAtivacao = servicoConfig?.deferimento_status_ativacao || [];
                    const defPendenciasAtivacao = servicoConfig?.deferimento_pendencias_ativacao || [];
                    // Use selectedStatus (local) instead of saved status for reactive toggle visibility
                    const activeStatus = selectedStatus || solicitacao.status;
                    const isPendenciaStatus = activeStatus === "vistoriado_com_pendencia";
                    const defStatusMatch = defStatusAtivacao.length > 0 && defStatusAtivacao.includes(activeStatus);
                    // Check pendências against LOCAL state (pendenciasSelecionadas) for reactive visibility
                    const defPendenciasMatch = defPendenciasAtivacao.length > 0 && defPendenciasAtivacao.some((p: string) => pendenciasSelecionadas.includes(p));
                    const showDeferimento = isPosicionamento && (isPendenciaStatus ? defPendenciasMatch : (defStatusMatch || defPendenciasMatch));
                    if (!showDeferimento && !solicitarDeferimento) return null;
                    return (
                      <div className={`flex items-center justify-between border rounded-md p-3 ${showDeferimento ? 'bg-white' : 'bg-muted/50 opacity-60'}`}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <div className="flex flex-col">
                            <Label className="cursor-pointer" htmlFor="solicitar-def">Solicitar Deferimento</Label>
                            <span className="text-[10px] text-muted-foreground">
                              {isPosicionamento ? "Habilita envio de anexo na pág. externa" : "Disponível apenas para Posicionamento"}
                            </span>
                          </div>
                        </div>
                        <Switch
                          id="solicitar-def"
                          checked={solicitarDeferimento}
                          onCheckedChange={setSolicitarDeferimento}
                          disabled={!showDeferimento}
                        />
                      </div>
                    );
                  })()}

                  {/* Lacre Armador Toggle + Confirmação de Lançamento lado a lado */}
                  {(() => {
                    const isPosicionamento = servicoConfig?.nome?.toLowerCase().includes("posicionamento");
                    const lacreStatusAtivacao = servicoConfig?.lacre_armador_status_ativacao || [];
                    const lacrePendenciasAtivacao = servicoConfig?.lacre_armador_pendencias_ativacao || [];
                    // Use local selectedStatus for reactive visibility
                    const activeStatus = selectedStatus || solicitacao.status;
                    const isPendenciaStatus = activeStatus === "vistoriado_com_pendencia";
                    const statusMatch = lacreStatusAtivacao.length > 0 && lacreStatusAtivacao.includes(activeStatus);
                    // Check pendências against LOCAL state for reactive visibility
                    const pendenciasMatch = lacrePendenciasAtivacao.length > 0 && lacrePendenciasAtivacao.some((p: string) => pendenciasSelecionadas.includes(p));
                    const showLacre = isPosicionamento && (isPendenciaStatus ? pendenciasMatch : (statusMatch || pendenciasMatch));
                    if (!showLacre && !solicitarLacreArmador) return null;
                    // Pendencia billing badge logic
                     const pendenciaConfig = cobrancaConfigs.find((cfg: any) => cfg.tipo === "pendencia");
                     const pendenciaRegistro = pendenciaConfig ? lancamentoRegistros.find((r: any) => r.cobranca_config_id === pendenciaConfig.id) : null;
                     const pendenciaConfirmed = pendenciaRegistro?.confirmado === true;
                     const showPendenciaBadge = solicitarLacreArmador && isPosicionamento && solicitacao.lacre_armador_aceite_custo === true;
                     return (
                      <>
                        <div className="flex gap-2">
                          <div className={`flex-1 basis-1/2 flex items-center justify-between border rounded-md p-2.5 ${showLacre ? 'bg-white' : 'bg-muted/50 opacity-60'}`}>
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                              <div className="flex flex-col">
                              <Label className="cursor-pointer text-sm" htmlFor="solicitar-lacre">Posicionamento — Pendência de Lacre</Label>
                                <span className="text-[10px] text-muted-foreground leading-tight">
                                  {isPosicionamento ? "Novo posicionamento para inserir lacre armador" : "Apenas Posicionamento"}
                                </span>
                              </div>
                            </div>
                            <Switch
                              id="solicitar-lacre"
                              checked={solicitarLacreArmador}
                              onCheckedChange={(checked) => {
                                setSolicitarLacreArmador(checked);
                                if (!checked) setCustoLacreArmador(null);
                              }}
                              disabled={!showLacre}
                            />
                          </div>

                          {/* Custo Posic. Lacre - indicador visual */}
                          {showPendenciaBadge && (
                            <div className={`flex-1 basis-1/2 border rounded-md p-2.5 flex items-center ${
                              pendenciaConfirmed
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                            }`}>
                              <div className={`flex items-center gap-1.5 ${pendenciaConfirmed ? "text-green-600" : "text-red-600"}`}>
                                <DollarSign className="h-3.5 w-3.5" />
                                <span className="text-xs font-semibold">
                                  {pendenciaConfig?.rotulo_analise || "Custo Posic. Lacre"}: {pendenciaConfirmed ? "Confirmado" : "Pendente"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Cobrança de Serviço para Lacre Armador */}
                        {solicitarLacreArmador && isPosicionamento && (
                          <div className="space-y-2 border rounded-md p-3 bg-amber-50 border-amber-200 ml-6">
                            <Label className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Há cobrança de novo serviço (Posicionamento — Pendência de Lacre armador)?
                            </Label>
                            <p className="text-xs text-amber-700">
                              Confirme se houve cobrança operacional para o novo posicionamento de inserção do lacre armador. Se sim, o lançamento financeiro será exigido.
                            </p>
                            <div className="flex gap-4 mt-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="custo_lacre"
                                  checked={custoLacreArmador === true}
                                  onChange={() => setCustoLacreArmador(true)}
                                  className="accent-amber-600"
                                />
                                <span className="text-sm font-medium">Sim</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="custo_lacre"
                                  checked={custoLacreArmador === false}
                                  onChange={() => setCustoLacreArmador(false)}
                                  className="accent-amber-600"
                                />
                                <span className="text-sm font-medium">Não</span>
                              </label>
                            </div>
                            {custoLacreArmador === true && (
                              <p className="text-xs text-amber-700 mt-1 italic">
                                O lançamento financeiro será ativado após salvar.
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {(() => {
                    const terminalStatuses = [
                      "nao_vistoriado",
                      "recusado",
                      "cancelado",
                      "servico_concluido",
                      "vistoria_finalizada",
                    ];
                    if (terminalStatuses.includes(solicitacao.status)) return null;
                    return (
                      <Button 
                        onClick={handleUpdateStatus} 
                        disabled={loading} 
                        className="jbs-btn-primary w-full"
                      >
                        Salvar Alterações
                      </Button>
                    );
                  })()}
                </div>
              </>
            )}


            {(() => {
              const applicableCobrancas = cobrancaConfigs.filter((cfg: any) => {
                const statusAtivacao = cfg.status_ativacao || [];
                if (statusAtivacao.length > 0 && !statusAtivacao.includes(solicitacao.status)) return false;
                return true;
              });

              if (applicableCobrancas.length === 0) return null;

              return (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Cobrança: ações rápidas</p>
                    <div className="flex items-center gap-1.5">
                      {applicableCobrancas.map((cfg: any) => {
                        const registro = lancamentoRegistros.find((r: any) => r.cobranca_config_id === cfg.id);
                        const isConfirmed = registro?.confirmado === true;
                        const isBlocked = cfg.tipo === "pendencia" && solicitacao.lacre_armador_aceite_custo !== true;

                        return (
                          <button
                            key={cfg.id}
                            type="button"
                            onClick={() => {
                              if (isConfirmed) return;
                              if (isBlocked) {
                                setBlockedBillingConfig(cfg);
                                return;
                              }
                              setBillingDialogData({ config: cfg });
                            }}
                            title={`${cfg.rotulo_analise}: ${isConfirmed ? "Confirmado" : isBlocked ? "Fluxo bloqueado" : "Pendente"}`}
                            className="p-1 rounded hover:bg-muted/50 transition-colors disabled:opacity-60"
                            disabled={isConfirmed}
                          >
                            {isConfirmed ? (
                              <Check className="h-4 w-4 text-muted-foreground/50" />
                            ) : isBlocked ? (
                              <span className="relative inline-flex items-center text-amber-700">
                                <DollarSign className="h-4 w-4" />
                                <Lock className="h-2.5 w-2.5 absolute -bottom-0.5 -right-1" />
                              </span>
                            ) : (
                              <DollarSign className="h-4 w-4 text-destructive" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Anexos */}
            {attachments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Anexos
                  </p>
                  <div className="space-y-2">
                    {showEmbeddedPreview ? (
                      attachments.map((att) => (
                        <div key={att.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{att.file_name}</span>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={att.file_url} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                          <div className="bg-muted/30 rounded overflow-hidden">
                            {att.file_url.toLowerCase().endsWith('.pdf') ? (
                              <iframe 
                                src={att.file_url} 
                                className="w-full h-[250px]" 
                                title={att.file_name}
                              />
                            ) : (
                              <img 
                                src={att.file_url} 
                                alt={att.file_name} 
                                className="max-w-full max-h-[250px] mx-auto"
                              />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      attachments.map((att) => (
                        <div key={att.id} className="border rounded-lg p-3 flex items-center justify-between">
                          <span className="text-sm">{att.file_name}</span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPreviewUrl(att.file_url)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Visualizar
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={att.file_url} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Observações e Histórico */}
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Observações
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-1">
                  <button
                    type="button"
                    onClick={() => setObservacaoTipo("interna")}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      observacaoTipo === "interna"
                        ? "bg-muted border-border text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Lock className="h-3 w-3" />
                    🔒 Interna
                  </button>
                  <button
                    type="button"
                    onClick={() => setObservacaoTipo("externa")}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      observacaoTipo === "externa"
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🌐 Externa (Cliente)
                  </button>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={observacaoTexto}
                    onChange={(e) => setObservacaoTexto(e.target.value)}
                    placeholder={observacaoTipo === "externa" ? "Esta observação será visível na consulta pública..." : "Adicionar nova observação (uso interno)..."}
                    className="min-h-[60px]"
                  />
                  <Button onClick={handleSaveObservacao} disabled={loading || !observacaoTexto.trim()} size="sm" className="self-end">
                    Atualizar Observação
                  </Button>
                </div>
              </div>

              {observacaoHistorico.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                    <History className="h-3 w-3" />
                    Histórico de Observações
                  </p>
                  <div className="max-h-[200px] overflow-auto space-y-2">
                    {observacaoHistorico.map((obs) => {
                      const isExterna = obs.tipo_observacao === "externa";
                      const isAutoRecusaCorte = obs.tipo_observacao === "sistema_auto_recusa_corte";

                      return (
                      <div key={obs.id} className={`rounded-lg p-2 text-xs ${isExterna ? "bg-blue-50 border border-blue-100" : isAutoRecusaCorte ? "bg-amber-50 border border-amber-200" : "bg-muted/50"}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium flex items-center gap-1.5">
                            {obs.autor_nome || "Sistema"}
                            {isExterna ? (
                              <span className="text-[10px] text-blue-600 font-normal">🌐 Externa</span>
                            ) : isAutoRecusaCorte ? (
                              <span className="text-[10px] text-amber-700 font-normal">⚠️ Recusado automaticamente</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-normal">🔒 Interna</span>
                            )}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(obs.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {obs.observacao.startsWith("[Correção de Status]") ? (
                          <div className="text-foreground">
                            {(() => {
                              const text = obs.observacao.replace("[Correção de Status] ", "");
                              const newMatch = text.match(/^Status:\s*(.+?)\.\s*\n?Observação:\s*(.+?)\.?$/s);
                              if (newMatch) {
                                return (
                                  <>
                                    <p><strong>Status:</strong> {newMatch[1].trim()}.</p>
                                    <p><strong>Observação:</strong> {newMatch[2].trim()}.</p>
                                  </>
                                );
                              }
                              const oldMatch = text.match(/^De\s+"([^"]+)"\s+para\s+"([^"]+)":\s*(.+)$/s);
                              if (oldMatch) {
                                return (
                                  <>
                                    <p><strong>Status:</strong> {oldMatch[2].trim()}.</p>
                                    <p><strong>Observação:</strong> {oldMatch[3].trim()}.</p>
                                  </>
                                );
                              }
                              return <p>{text}</p>;
                            })()}
                          </div>
                        ) : (
                          <p className="text-foreground">{obs.observacao}</p>
                        )}
                        <StatusBadge status={obs.status_no_momento} />
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Ações de Cancelamento / Recusa - no final, lado esquerdo, metade do tamanho */}
            {(canCancel || canRecusar) && solicitacao.status !== 'cancelado' && solicitacao.status !== 'recusado' && (
              <div className="flex justify-start mt-4">
                <div className="w-1/2 space-y-2 bg-destructive/5 p-2 rounded-lg border border-destructive/20">
                  <p className="text-xs font-semibold text-destructive">Ações de Cancelamento / Recusa:</p>
                  <div className="flex gap-2">
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelarClick}
                        disabled={loading}
                        className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 text-xs h-7"
                      >
                        <Ban className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                    )}
                    {canRecusar && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRecusarClick}
                        disabled={loading}
                        className="flex-1 text-xs h-7"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Recusar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewUrl && (
        <Dialog open onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Visualizar Documento</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-[60vh]">
              {previewUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewUrl} className="w-full h-[60vh]" title="Preview" />
              ) : (
                <img src={previewUrl} alt="Preview" className="max-w-full max-h-[60vh] mx-auto" />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewUrl(null)}>Fechar</Button>
              <Button asChild>
                <a href={previewUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog para confirmar lançamento */}
      <Dialog open={showLancamentoDialog} onOpenChange={setShowLancamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Confirmar Lançamento — {cobrancaConfigs.find((c: any) => c.tipo === "servico")?.rotulo_analise || "Serviço"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirme que a cobrança foi lançada no sistema financeiro.
            </p>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm"><strong>Protocolo:</strong> {solicitacao.protocolo}</p>
              <p className="text-sm"><strong>Cliente:</strong> {solicitacao.cliente_nome}</p>
              {cobrancaConfigs.filter((c: any) => c.tipo === "servico").map((cfg: any) => (
                <p key={cfg.id} className="text-sm"><strong>Cobrança:</strong> {cfg.rotulo_analise}</p>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLancamentoDialog(false)}>Cancelar</Button>
            <Button onClick={() => {
              const servicoCfg = cobrancaConfigs.find((c: any) => c.tipo === "servico");
              handleConfirmarLancamento(servicoCfg?.id);
            }} disabled={loading} className="jbs-btn-primary">
              <Check className="h-4 w-4 mr-2" />
              Confirmar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {billingDialogData && (
        <BillingConfirmDialog
          open={!!billingDialogData}
          onOpenChange={(open) => { if (!open) setBillingDialogData(null); }}
          solicitacao={solicitacao}
          cobrancaConfig={billingDialogData.config}
          userId={userId}
          onUpdate={async () => {
            setBillingDialogData(null);
            await refreshLancamentoRegistros();
          }}
        />
      )}

      <AlertDialog open={!!blockedBillingConfig} onOpenChange={(open) => { if (!open) setBlockedBillingConfig(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-700" />
              Fluxo de cobrança bloqueado
            </AlertDialogTitle>
            <AlertDialogDescription>
              A cobrança "{blockedBillingConfig?.rotulo_analise || "Pendência"}" será habilitada somente após aceite de custo para lacre armador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setBlockedBillingConfig(null)}>Fechar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de lançamento ao concluir serviço */}
      <AlertDialog open={showConclusaoLancamentoDialog} onOpenChange={setShowConclusaoLancamentoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              Confirmação de Lançamento — {cobrancaConfigs.find((c: any) => c.tipo === "servico")?.rotulo_analise || "Financeiro"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Ao marcar o serviço como <strong>concluído</strong>, é necessário informar se a cobrança já foi lançada no sistema financeiro.
              </p>
              <div className="bg-muted p-3 rounded text-sm">
                <p><strong>Protocolo:</strong> {solicitacao.protocolo}</p>
                <p><strong>Serviço:</strong> {solicitacao.tipo_operacao}</p>
                <p><strong>Cliente:</strong> {solicitacao.cliente_nome}</p>
                {cobrancaConfigs.filter((c: any) => c.tipo === "servico").map((cfg: any) => (
                  <p key={cfg.id}><strong>Cobrança:</strong> {cfg.rotulo_analise}</p>
                ))}
              </div>
              <p className="font-medium">A cobrança do serviço já foi lançada no sistema?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeSaveStatus(false)}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Não, lançar depois
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => executeSaveStatus(true)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Check className="h-4 w-4 mr-2" />
              Sim, já foi lançada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de justificativa para status não conforme */}
      <Dialog open={showJustificativaNaoVistoriado} onOpenChange={setShowJustificativaNaoVistoriado}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Motivo — {statusOptions.find((s: any) => s.value === selectedStatus)?.label || selectedStatus}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Informe o motivo para este status.
            </p>
            <Textarea
              value={justificativaNaoVistoriado}
              onChange={(e) => setJustificativaNaoVistoriado(e.target.value)}
              placeholder="Descreva o motivo..."
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowJustificativaNaoVistoriado(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!justificativaNaoVistoriado.trim()}
              onClick={() => {
                setShowJustificativaNaoVistoriado(false);
                // Re-trigger save now that justification is filled
                handleUpdateStatus();
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showRecusaConfirm} onOpenChange={setShowRecusaConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmação de Recusa
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta ação irá <strong>recusar</strong> o pedido e interromper o fluxo do processo.
              </p>
              <div className="bg-muted p-3 rounded text-sm">
                <strong>Protocolo:</strong> {solicitacao.protocolo}<br />
                <strong>Justificativa:</strong> {justificativa}
              </div>
              <p className="text-destructive font-medium">
                Deseja realmente continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRecusa} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Recusa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Alteração para Aprovado */}
      <AlertDialog open={showAlteracaoConfirm} onOpenChange={setShowAlteracaoConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Confirmação de Alteração
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está alterando a decisão anterior de <strong>Recusado</strong> para <strong>Aprovado</strong>.
              </p>
              <div className="bg-muted p-3 rounded text-sm">
                <strong>Protocolo:</strong> {solicitacao.protocolo}<br />
                <strong>Justificativa da alteração:</strong> {justificativa}
              </div>
              <p className="font-medium">
                Deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAlteracao} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Confirmar Aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Cancelamento */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Cancelar Solicitação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p><strong>Protocolo:</strong> {solicitacao.protocolo}</p>
              <p><strong>Cliente:</strong> {solicitacao.cliente_nome}</p>
              <p><strong>Status atual:</strong> {solicitacao.status_vistoria || solicitacao.status}</p>
            </div>

            {canCancelConfirmacao && (
              <div className="space-y-2 border rounded-md p-3 bg-amber-50 border-amber-200">
                <Label className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Há cobrança de posicionamento?
                </Label>
                <p className="text-xs text-amber-700">
                  Cancelamento após confirmação requer validação de cobrança operacional.
                </p>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="custo_cancel"
                      checked={custoposicionamento === true}
                      onChange={() => setCustoposicionamento(true)}
                      className="accent-amber-600"
                    />
                    <span className="text-sm font-medium">Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="custo_cancel"
                      checked={custoposicionamento === false}
                      onChange={() => setCustoposicionamento(false)}
                      className="accent-amber-600"
                    />
                    <span className="text-sm font-medium">Não</span>
                  </label>
                </div>
                {custoposicionamento === true && (
                  <p className="text-xs text-amber-700 mt-1 italic">
                    O lançamento financeiro será ativado após salvar.
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Justificativa (opcional)</Label>
              <Textarea
                value={cancelJustificativa}
                onChange={(e) => setCancelJustificativa(e.target.value)}
                placeholder="Motivo do cancelamento..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Voltar</Button>
            <Button
              variant="destructive"
              onClick={executeCancelamento}
              disabled={loading || (canCancelConfirmacao && !canCancelDireto && custoposicionamento === null)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Recusa */}
      <Dialog open={showRecusarDialog} onOpenChange={setShowRecusarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Recusar Solicitação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p><strong>Protocolo:</strong> {solicitacao.protocolo}</p>
              <p><strong>Cliente:</strong> {solicitacao.cliente_nome}</p>
            </div>
            <div>
              <Label>Justificativa (obrigatória, mín. 10 caracteres)</Label>
              <Textarea
                value={cancelJustificativa}
                onChange={(e) => setCancelJustificativa(e.target.value)}
                placeholder="Informe o motivo da recusa..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecusarDialog(false)}>Voltar</Button>
            <Button
              variant="destructive"
              onClick={executeRecusa}
              disabled={loading || cancelJustificativa.trim().length < 10}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper Functions
const formatFormValue = (val: any, tipo: string): string => {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    if (val.campo1 && val.campo2) return `${val.campo1} / ${val.campo2}`;
    return normalizeFormValue(val, { nullishFallback: "—", preserveObjects: true });
  }

  return normalizeFormValue(val, { nullishFallback: "—" });
};

// Helper Components
const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground mt-0.5">{icon}</span>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium whitespace-pre-line">{value}</p>
    </div>
  </div>
);

const ApprovalCard = ({ 
  label, 
  approved, 
  justificativa, 
  data,
  isCurrentSetor 
}: { 
  label: string; 
  approved: boolean | null; 
  justificativa?: string;
  data?: string;
  isCurrentSetor: boolean;
}) => {
  const getBg = () => {
    if (approved === null) return "bg-muted/50";
    if (approved) return "bg-secondary/10 border-secondary";
    return "bg-destructive/10 border-destructive";
  };

  return (
    <div className={`rounded-lg p-3 border ${getBg()} ${isCurrentSetor ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{label}</span>
        {approved === null && <Clock className="h-4 w-4 text-muted-foreground" />}
        {approved === true && <CheckCircle2 className="h-4 w-4 text-secondary" />}
        {approved === false && <XCircle className="h-4 w-4 text-destructive" />}
      </div>
      <p className="text-xs text-muted-foreground">
        {approved === null && "Pendente"}
        {approved === true && "Aprovado"}
        {approved === false && "Recusado"}
      </p>
      {data && (
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(data).toLocaleDateString("pt-BR")} às {new Date(data).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      {justificativa && (
        <p className="text-xs mt-2 text-muted-foreground italic">"{justificativa}"</p>
      )}
    </div>
  );
};

const getSetorLabel = (setor: string | null) => {
  if (!setor) return "—";
  const labels: Record<string, string> = {
    "COMEX": "Administrativo",
    "ARMAZEM": "Operacional",
  };
  return labels[setor] || setor;
};

export default AnaliseDialog;

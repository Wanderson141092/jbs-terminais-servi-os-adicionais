import { useState, useEffect } from "react";
import { formatTipoCarga } from "@/lib/tipoCarga";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertTriangle, FileText, Package, User, Calendar, Clock, Download, Eye, Check, X, DollarSign, MessageSquare, History, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from "./StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface ObservacaoHistorico {
  id: string;
  observacao: string;
  status_no_momento: string;
  autor_nome: string | null;
  created_at: string;
}

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
  const [observacaoHistorico, setObservacaoHistorico] = useState<ObservacaoHistorico[]>([]);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [pendenciaOpcoes, setPendenciaOpcoes] = useState<any[]>([]);
  const [pendenciasSelecionadas, setPendenciasSelecionadas] = useState<string[]>([]);
  const [solicitarDeferimento, setSolicitarDeferimento] = useState(false);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCnpj, setClienteCnpj] = useState("");
  const [camposDinamicos, setCamposDinamicos] = useState<{ campo_nome: string; valor: string }[]>([]);
  const [custoposicionamento, setCustoposicionamento] = useState<boolean | null>(solicitacao.custo_posicionamento ?? null);


  useEffect(() => {
    const fetchData = async () => {
      const [attachRes, servicoRes, allServicosRes, histRes, statusRes, pendenciaRes, camposValoresRes] = await Promise.all([
        supabase.from("deferimento_documents").select("*").eq("solicitacao_id", solicitacao.id).neq("document_type", "deferimento"),
        supabase.from("servicos").select("*").eq("nome", solicitacao.tipo_operacao || "Posicionamento").maybeSingle(),
        supabase.from("servicos").select("*, status_confirmacao_lancamento").eq("ativo", true),
        supabase.from("observacao_historico").select("*").eq("solicitacao_id", solicitacao.id).order("created_at", { ascending: false }),
        supabase.from("parametros_campos").select("*").eq("grupo", "status_processo").eq("ativo", true).order("ordem"),
        supabase.from("parametros_campos").select("*").eq("grupo", "pendencia_opcoes").eq("ativo", true).order("ordem"),
        supabase.from("campos_analise_valores").select("campo_id, valor, campos_analise(nome)").eq("solicitacao_id", solicitacao.id),
      ]);

      setAttachments(attachRes.data || []);
      if (servicoRes.data) setServicoConfig(servicoRes.data);
      setServicos(allServicosRes.data || []);
      setObservacaoHistorico((histRes.data as ObservacaoHistorico[]) || []);
      setSolicitarDeferimento(solicitacao.solicitar_deferimento || false);
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
        label: s.valor
      }));
      
      setStatusOptions(dynamicOptions);
      setPendenciaOpcoes(pendenciaRes.data || []);
      setPendenciasSelecionadas(solicitacao.pendencias_selecionadas || []);

      // Build dynamic fields display
      const camposVals = (camposValoresRes.data || []).map((cv: any) => ({
        campo_nome: cv.campos_analise?.nome || "Campo",
        valor: cv.valor || "",
      })).filter((cv: any) => cv.valor);
      setCamposDinamicos(camposVals);
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
  
  const canDecide = approvalRequired && solicitacao.status === "aguardando_confirmacao" && !alreadyApproved && setor !== null;
  const canChangeRefusal = approvalRequired && wasRefused && solicitacao.status !== "recusado";

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
    
    const updateData: any = {};
    const logAction = aprovado 
      ? (wasRefused ? "Alteração para Aprovado" : "Aprovação")
      : "Recusa";
    const setorLabel = isComex ? "Administrativo" : "Operacional";

    if (isComex) {
      updateData.comex_aprovado = aprovado;
      updateData.comex_usuario_id = userId;
      updateData.comex_data = new Date().toISOString();
      if (!aprovado || wasRefused) {
        updateData.comex_justificativa = justificativa;
      }
    } else {
      updateData.armazem_aprovado = aprovado;
      updateData.armazem_usuario_id = userId;
      updateData.armazem_data = new Date().toISOString();
      if (!aprovado || wasRefused) {
        updateData.armazem_justificativa = justificativa;
      }
    }

    const { error } = await supabase
      .from("solicitacoes")
      .update(updateData)
      .eq("id", solicitacao.id);

    if (error) {
      toast.error("Erro ao salvar decisão: " + error.message);
      setLoading(false);
      return;
    }

    const detalhes = justificativa.trim() 
      ? `${logAction} pelo setor ${setorLabel}. Justificativa: ${justificativa}`
      : `${logAction} pelo setor ${setorLabel}`;

    await logAudit(logAction.toLowerCase(), detalhes);

    const notifMsg = aprovado
      ? `Solicitação ${solicitacao.protocolo} aprovada pelo setor ${setorLabel}`
      : `Solicitação ${solicitacao.protocolo} recusada pelo setor ${setorLabel}: ${justificativa}`;

    await createNotification(notifMsg, aprovado ? "aprovacao" : "recusa");

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

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    if (selectedStatus === solicitacao.status && 
        solicitarDeferimento === solicitacao.solicitar_deferimento && 
        JSON.stringify(pendenciasSelecionadas) === JSON.stringify(solicitacao.pendencias_selecionadas)) {
      toast.info("Nenhuma alteração detectada.");
      return;
    }
    
    // Validação: cancelamento pós-confirmação requer resposta sobre custo
    if (isLateCancel(selectedStatus) && custoposicionamento === null) {
      toast.error("Informe se há custo de posicionamento antes de salvar.");
      return;
    }
    
    // Validação: só permite mudança de status de vistoria se ambos aprovaram (se aprovação for ativada)
    const bothApproved = solicitacao.comex_aprovado === true && solicitacao.armazem_aprovado === true;
    const vistoriaStatuses = ["vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado"];
    
    if (approvalRequired && vistoriaStatuses.includes(selectedStatus) && !bothApproved) {
      toast.error("Ambos os setores (Administrativo e Operacional) devem aprovar antes de alterar para este status.");
      return;
    }
    
    setLoading(true);
    
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
      pendencias_selecionadas: pendenciasSelecionadas,
      cliente_nome: clienteNome.trim(),
      cnpj: clienteCnpj.trim() || null,
      updated_at: new Date().toISOString()
    };

    // If late cancellation, save custo_posicionamento and trigger lançamento if needed
    if (isLateCancel(selectedStatus)) {
      updatePayload.custo_posicionamento = custoposicionamento;
      if (custoposicionamento === true) {
        // Mark lancamento as pending (same as financial launch flow)
        updatePayload.lancamento_confirmado = false;
      }
    }
    
    const { error } = await supabase
      .from("solicitacoes")
      .update(updatePayload)
      .eq("id", solicitacao.id);

    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
      setLoading(false);
      return;
    }
    
    const statusLabel = statusOptions.find(s => s.value === selectedStatus)?.label || selectedStatus;
    
    let details = `Status atualizado para: ${statusLabel}`;
    if (isLateCancel(selectedStatus)) {
      details += `. Cancelamento tardio (pós-confirmação). Custo de posicionamento: ${custoposicionamento ? "Sim" : "Não"}`;
      if (custoposicionamento === true) {
        details += `. Lançamento financeiro ativado.`;
      }
    }
    if (solicitarDeferimento !== solicitacao.solicitar_deferimento) {
      details += `. Solicitar Deferimento: ${solicitarDeferimento ? "Ativado" : "Desativado"}`;
    }
    if (JSON.stringify(pendenciasSelecionadas) !== JSON.stringify(solicitacao.pendencias_selecionadas)) {
      details += `. Pendências atualizadas.`;
    }

    await logAudit("status_atualizado", details);
    await createNotification(`Status da solicitação ${solicitacao.protocolo} atualizado para: ${statusLabel}`, "status");
    
    // Dispatch email/notification via edge function
    supabase.functions.invoke("notificar-status", {
      body: { solicitacao_id: solicitacao.id, novo_status: selectedStatus, usuario_id: userId },
    }).catch(() => {}); // Fire and forget
    
    toast.success("Atualização realizada com sucesso!");
    setLoading(false);
    onClose();
  };

  const handleDeferimentoDecision = async (docId: string, aceito: boolean) => {
    setLoading(true);
    
    const updateData: any = { status: aceito ? 'aceito' : 'recusado' };
    if (!aceito) {
      updateData.motivo_recusa = motivoRecusaDeferimento;
    }
    
    const { error } = await supabase
      .from("deferimento_documents")
      .update(updateData)
      .eq("id", docId);

    if (error) {
      toast.error("Erro ao atualizar status do deferimento");
      setLoading(false);
      return;
    }

    const logDetalhes = aceito 
      ? "Deferimento aceito - Status alterado para 'Recebido'" 
      : `Deferimento recusado: ${motivoRecusaDeferimento}`;
    await logAudit("deferimento", logDetalhes);
    await createNotification(`Deferimento ${aceito ? 'aceito' : 'recusado'} para ${solicitacao.protocolo}`, "deferimento");
    
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

  const handleConfirmarLancamento = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("solicitacoes")
      .update({
        lancamento_confirmado: true,
        lancamento_confirmado_por: userId,
        lancamento_confirmado_data: new Date().toISOString()
      })
      .eq("id", solicitacao.id);

    if (error) {
      toast.error("Erro ao confirmar lançamento");
    } else {
      await logAudit("lancamento", "Lançamento do serviço confirmado");
      toast.success("Lançamento confirmado!");
      setShowLancamentoDialog(false);
      onClose();
    }
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
      autor_nome: profile.nome || profile.email
    });

    if (histError) {
      toast.error("Erro ao salvar observação");
      setLoading(false);
      return;
    }

    await supabase.from("solicitacoes").update({ observacoes: observacaoTexto.trim() }).eq("id", solicitacao.id);
    await logAudit("observacao", `Observação atualizada: ${observacaoTexto.trim()}`);

    const { data: histData } = await supabase
      .from("observacao_historico")
      .select("*")
      .eq("solicitacao_id", solicitacao.id)
      .order("created_at", { ascending: false });
    setObservacaoHistorico((histData as ObservacaoHistorico[]) || []);

    setObservacaoTexto("");
    toast.success("Observação registrada!");
    setLoading(false);
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
              Análise — {solicitacao.protocolo}
            </DialogTitle>
            <DialogDescription>
              Análise e decisão sobre a solicitação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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

            {/* Dynamic analysis fields */}
            {camposDinamicos.length > 0 && (
              <div className="grid grid-cols-2 gap-4 text-sm border rounded-lg p-3 bg-muted/20">
                <p className="col-span-2 text-xs font-semibold text-muted-foreground mb-1">Campos do Formulário</p>
                {camposDinamicos.map((cd, idx) => (
                  <InfoItem key={idx} icon={<FileText className="h-4 w-4" />} label={cd.campo_nome} value={cd.valor} />
                ))}
              </div>
            )}

            {solicitacao.observacoes && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{solicitacao.observacoes}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
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
                  <p className="text-sm font-semibold">Atualizar Status & Ações:</p>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o novo status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Custo de Posicionamento - cancelamento pós-confirmação */}
                  {isLateCancel(selectedStatus) && (
                    <div className="space-y-2 border rounded-md p-3 bg-amber-50 border-amber-200">
                      <Label className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Há custo de posicionamento?
                      </Label>
                      <p className="text-xs text-amber-700">
                        Cancelamento após confirmação requer validação de custo operacional.
                      </p>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="custoposicionamento"
                            checked={custoposicionamento === true}
                            onChange={() => setCustoposicionamento(true)}
                            className="accent-amber-600"
                          />
                          <span className="text-sm font-medium">Sim</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="custoposicionamento"
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
                      {custoposicionamento === null && (
                        <p className="text-xs text-red-600 mt-1">
                          Selecione uma opção para habilitar o salvamento.
                        </p>
                      )}
                    </div>
                  )}

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

                  {/* Solicitar Deferimento Toggle - apenas para Posicionamento */}
                  {(() => {
                    const isPosicionamento = servicoConfig?.nome?.toLowerCase().includes("posicionamento");
                    return (
                      <div className={`flex items-center justify-between border rounded-md p-3 ${isPosicionamento ? 'bg-white' : 'bg-muted/50 opacity-60'}`}>
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
                          disabled={!isPosicionamento}
                        />
                      </div>
                    );
                  })()}

                  <Button 
                    onClick={handleUpdateStatus} 
                    disabled={loading} 
                    className="jbs-btn-primary w-full"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </>
            )}

            {/* Confirmação de Lançamento */}
            {(() => {
              const svcConf = servicos.find(sv => sv.nome === (solicitacao.tipo_operacao || ""));
              const statusLanc = svcConf?.status_confirmacao_lancamento || [];
              return statusLanc.includes(solicitacao.status) && !solicitacao.lancamento_confirmado;
            })() && (
              <>
                <Separator />
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <DollarSign className="h-5 w-5" />
                    <span className="font-semibold">Aguardando confirmação de lançamento do serviço</span>
                  </div>
                  <Button 
                    onClick={() => setShowLancamentoDialog(true)} 
                    variant="outline" 
                    className="border-red-300 text-red-600 hover:bg-red-50 w-full"
                  >
                    Confirmar Lançamento
                  </Button>
                </div>
              </>
            )}

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
              <div className="flex gap-2">
                <Textarea
                  value={observacaoTexto}
                  onChange={(e) => setObservacaoTexto(e.target.value)}
                  placeholder="Adicionar nova observação..."
                  className="min-h-[60px]"
                />
                <Button onClick={handleSaveObservacao} disabled={loading || !observacaoTexto.trim()} size="sm" className="self-end">
                  Salvar
                </Button>
              </div>

              {observacaoHistorico.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                    <History className="h-3 w-3" />
                    Histórico de Observações
                  </p>
                  <div className="max-h-[200px] overflow-auto space-y-2">
                    {observacaoHistorico.map((obs) => (
                      <div key={obs.id} className="bg-muted/50 rounded-lg p-2 text-xs">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium">{obs.autor_nome || "Sistema"}</span>
                          <span className="text-muted-foreground">
                            {new Date(obs.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-foreground">{obs.observacao}</p>
                        <StatusBadge status={obs.status_no_momento} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              Confirmar Lançamento do Serviço
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirme que o serviço foi lançado no sistema financeiro.
            </p>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm"><strong>Protocolo:</strong> {solicitacao.protocolo}</p>
              <p className="text-sm"><strong>Cliente:</strong> {solicitacao.cliente_nome}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLancamentoDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarLancamento} disabled={loading} className="jbs-btn-primary">
              <Check className="h-4 w-4 mr-2" />
              Confirmar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Recusa */}
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
    </>
  );
};

// Helper Components
const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground mt-0.5">{icon}</span>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
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

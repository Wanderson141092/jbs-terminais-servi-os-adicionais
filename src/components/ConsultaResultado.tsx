import { useState } from "react";
import { Upload, FileText, Calendar, Package, User, Check, X, Clock, Eye, AlertTriangle, Download, Lock, Phone, Mail, Camera } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StatusBadge from "./StatusBadge";
import ProcessStageStepper from "./ProcessStageStepper";
import ProcessChecklist from "./ProcessChecklist";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatTipoCarga } from "@/lib/tipoCarga";
import { downloadExternalPdf } from "./ProcessoPdfGenerator";

interface Solicitacao {
  id: string;
  protocolo: string;
  lpco: string | null;
  numero_conteiner: string | null;
  cliente_nome: string;
  data_posicionamento: string | null;
  data_agendamento: string | null;
  tipo_carga: string | null;
  tipo_operacao: string | null;
  status: string;
  status_vistoria: string | null;
  created_at: string;
  categoria?: string | null;
  solicitar_deferimento?: boolean;
  solicitar_lacre_armador?: boolean;
  lacre_armador_possui?: boolean | null;
  lacre_armador_aceite_custo?: boolean | null;
  pendencias_selecionadas?: string[];
  comex_aprovado?: boolean | null;
  armazem_aprovado?: boolean | null;
}

interface DeferimentoDocument {
  id: string;
  file_name: string;
  file_url: string;
  status: string | null;
  motivo_recusa: string | null;
  created_at: string;
  document_type?: string;
}

interface ServicoConfig {
  nome?: string;
  tipo_agendamento: string | null;
  aprovacao_administrativo?: boolean;
  aprovacao_operacional?: boolean;
  deferimento_status_ativacao?: string[];
  lacre_armador_status_ativacao?: string[];
}

interface LacreArmadorConfig {
  mensagem_custo?: string;
  tipo_aceite?: string;
  titulo_externo?: string;
  anexo_ativo?: boolean;
  periodo_manha_ativo?: boolean;
  periodo_tarde_ativo?: boolean;
}

interface LacreArmadorDados {
  id: string;
  lacre_coletado: boolean | null;
  foto_lacre_url: string | null;
  foto_lacre_path: string | null;
  data_posicionamento_lacre: string | null;
  periodo_lacre: string | null;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
  responsavel_email: string | null;
  lacre_status: string;
  motivo_recusa: string | null;
}

interface ObservacaoItem {
  observacao: string;
  status_no_momento: string;
  created_at: string;
}

interface StatusLabel {
  sigla: string | null;
  valor: string;
  ordem: number;
}

interface EtapaConfig {
  chave: string;
  titulo: string;
  tipo: string;
  grupo: string;
  ordem: number;
  etapa_equivalente: string | null;
  status_gatilho: string[];
}

interface ConsultaResultadoProps {
  solicitacao: Solicitacao;
  deferimentoDocs?: DeferimentoDocument[];
  servicoConfig?: ServicoConfig | null;
  observacoes?: ObservacaoItem[];
  statusLabels?: StatusLabel[];
  etapasConfig?: EtapaConfig[];
  lacreArmadorConfig?: LacreArmadorConfig | null;
  lacreArmadorDados?: LacreArmadorDados | null;
  deferimentoTitulo?: string | null;
  formRespostas?: { rotulo: string; valor: any }[];
  formArquivos?: { file_name: string; file_url: string }[];
  onRefresh: () => void;
}

const ConsultaResultado = ({ solicitacao, deferimentoDocs = [], servicoConfig = null, observacoes = [], statusLabels = [], etapasConfig = [], lacreArmadorConfig = null, lacreArmadorDados = null, deferimentoTitulo = null, formRespostas = [], formArquivos = [], onRefresh }: ConsultaResultadoProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showLacreConfirmDialog, setShowLacreConfirmDialog] = useState(false);
  // Lacre form state
  const [lacreColetado, setLacreColetado] = useState<boolean | null>(null);
  const [lacreFotoFile, setLacreFotoFile] = useState<File | null>(null);
  const [lacreDataPos, setLacreDataPos] = useState("");
  const [lacrePeriodo, setLacrePeriodo] = useState("");
  const [lacreResponsavel, setLacreResponsavel] = useState("");
  const [lacreTelefone, setLacreTelefone] = useState("");
  const [lacreEmail, setLacreEmail] = useState("");
  const [savingLacre, setSavingLacre] = useState(false);

  const aprovacaoAdministrativo = servicoConfig?.aprovacao_administrativo ?? false;
  const aprovacaoOperacional = servicoConfig?.aprovacao_operacional ?? false;

  const cancelamentoSolicitado = (solicitacao as any).cancelamento_solicitado === true;
  const cancellableStatuses = ["aguardando_confirmacao", "confirmado_aguardando_vistoria"];
  const canCancel = cancellableStatuses.includes(solicitacao.status) && !cancelamentoSolicitado;

  const handleCancelSolicitacao = async () => {
    setCancelling(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("upload-publico", {
        body: { action: "cancelar_solicitacao", solicitacao_id: solicitacao.id },
      });
      if (error || response?.error) {
        throw new Error(response?.error || error?.message || "Erro ao cancelar.");
      }
      toast.success(response?.message || "Solicitação cancelada com sucesso.");
      setShowCancelDialog(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar solicitação.");
    } finally {
      setCancelling(false);
    }
  };

  const allDocs = deferimentoDocs.filter(d => d.document_type === "deferimento" || !d.document_type);
  const lacreDocs = deferimentoDocs.filter(d => d.document_type === "lacre_armador");
  const existingDoc = allDocs.length > 0 ? allDocs[0] : null;

  const getGeneralDeferimentoStatus = (): "recebido" | "recusado" | "aguardando" | null => {
    if (allDocs.length === 0) return null;
    // Se existe qualquer documento pendente (aguardando análise), o status geral é "aguardando"
    const hasPendente = allDocs.some(d => d.status === "pendente" || d.status === "aguardando");
    if (hasPendente) return "aguardando";
    // Se QUALQUER documento foi aceito, o deferimento está "recebido"
    // (documentos anteriores recusados são substituídos pelo novo aceito)
    const hasAceito = allDocs.some(d => d.status === "aceito");
    if (hasAceito) return "recebido";
    const hasRecusado = allDocs.some(d => d.status === "recusado");
    if (hasRecusado) return "recusado";
    return "aguardando";
  };

  const generalStatus = getGeneralDeferimentoStatus();

  // Lacre armador visibility - solicitar_lacre_armador is the source of truth (set during analysis)
  const showLacreArmador = (solicitacao as any).solicitar_lacre_armador === true;
  const lacreCurrentStatus = lacreArmadorDados?.lacre_status || "aguardando_preenchimento";
  const canFillLacreForm = showLacreArmador && (lacreCurrentStatus === "aguardando_preenchimento" || lacreCurrentStatus === "recusado");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato não permitido. Use PDF, JPG ou PNG.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewFile({ file, url });
    setShowConfirmDialog(true);
  };

  const handleConfirmUpload = async () => {
    if (!previewFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", previewFile.file);
      formData.append("bucket", "deferimento");
      formData.append("solicitacao_id", solicitacao.id);
      formData.append("document_type", "deferimento");

      const { data: response, error } = await supabase.functions.invoke("upload-publico", {
        body: formData,
      });

      if (error || response?.error) {
        throw new Error(response?.error || error?.message || "Erro ao enviar arquivo");
      }

      toast.success("Deferimento enviado com sucesso! Aguardando confirmação.");
      setShowConfirmDialog(false);
      setPreviewFile(null);
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao enviar arquivo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
    setShowConfirmDialog(false);
  };

  // Show deferimento when both conditions are met:
  // 1. Current status is in deferimento_status_ativacao list (or no config available, fallback to true)
  // 2. solicitar_deferimento toggle is active on the process
  const statusInDeferimentoActivation = servicoConfig?.deferimento_status_ativacao?.includes(solicitacao.status) ?? true;
  const showDeferimento = statusInDeferimentoActivation && solicitacao.solicitar_deferimento === true;
  const canUpload = showDeferimento && (allDocs.length === 0 || generalStatus === "recusado") && generalStatus !== "aguardando";

  const getDeferimentoStatusSection = () => {
    if (generalStatus === "recebido") {
      return (
        <Alert className="border-green-500 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2">
            <span className="font-semibold text-green-700">Deferimento Recebido</span>
            <p className="text-sm text-green-600 mt-1">
              Todos os documentos foram recebidos e aprovados.
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    if (generalStatus === "recusado") {
      const recusedDoc = allDocs.find(d => d.status === "recusado");
      return (
        <div className="space-y-3">
          <Alert className="border-red-500 bg-red-50">
            <X className="h-4 w-4 text-red-600" />
            <AlertDescription className="ml-2">
              <span className="font-semibold text-red-700">Reenviar anexo para nova análise e validação do recebimento</span>
              {recusedDoc?.motivo_recusa && (
                <p className="text-sm text-red-600 mt-1">
                  <strong>Motivo:</strong> {recusedDoc.motivo_recusa}
                </p>
              )}
            </AlertDescription>
          </Alert>
          
          <div className="bg-red-50 border border-red-300 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4 text-red-600" />
              Reenviar Deferimento
            </p>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={uploading}
              className="text-sm border-red-300 focus:ring-red-500"
            />
          </div>
        </div>
      );
    }

    if (generalStatus === "aguardando") {
      return (
        <Alert className="border-yellow-500 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="ml-2">
            <span className="font-semibold text-yellow-700">Aguardando Atendimento</span>
            <p className="text-sm text-yellow-600 mt-1">
              Documento(s) enviado(s). Aguardando análise pela equipe.
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    if (canUpload) {
      return (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <p className="text-sm font-semibold text-yellow-700 mb-3 flex items-center gap-2">
            <Upload className="h-4 w-4 text-yellow-600" />
            Aguardando confirmação do deferimento
          </p>
          <p className="text-xs text-yellow-600 mb-3">
            Envie o deferimento de liberação do órgão (PDF, JPG ou PNG).
          </p>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            disabled={uploading}
            className="text-sm border-yellow-300 focus:ring-yellow-500"
          />
        </div>
      );
    }

    return null;
  };

  const isPositionamento = (solicitacao.tipo_operacao || "").toLowerCase().includes("posicionamento");
  const isAgendamento = servicoConfig?.tipo_agendamento === "data_horario";

  const getDateLabel = () => {
    if (isPositionamento) return "Posicionar dia";
    if (isAgendamento) return "Agendar para";
    return "Data do serviço";
  };

  const formattedTipoCarga = formatTipoCarga(solicitacao.tipo_carga);

  const getDateValue = () => {
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

  // Status color for status badge
  const getStatusColor = (status: string) => {
    if (status === "vistoria_finalizada") return "text-green-700 bg-green-50 border-green-200";
    if (status === "vistoriado_com_pendencia") return "text-yellow-700 bg-yellow-50 border-yellow-200";
    if (status === "nao_vistoriado") return "text-red-700 bg-red-50 border-red-200";
    if (status === "confirmado_aguardando_vistoria") return "text-blue-700 bg-blue-50 border-blue-200";
    if (status === "recusado" || status === "cancelado") return "text-red-700 bg-red-50 border-red-200";
    if (status === "aguardando_confirmacao") return "text-blue-700 bg-blue-50 border-blue-200";
    return "text-yellow-700 bg-yellow-50 border-yellow-200";
  };

  const infoItems = [
    solicitacao.categoria ? { icon: <FileText className="h-4 w-4" />, label: "Categoria", value: solicitacao.categoria } : null,
    solicitacao.numero_conteiner ? { icon: <Package className="h-4 w-4" />, label: "Contêiner", value: solicitacao.numero_conteiner } : null,
    { icon: <Calendar className="h-4 w-4" />, label: getDateLabel(), value: getDateValue() !== "—" ? getDateValue() : null },
    { icon: <Clock className="h-4 w-4" />, label: "Data do protocolo", value: solicitacao.created_at ? new Date(solicitacao.created_at).toLocaleDateString("pt-BR") : null },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-primary/5 rounded-t-lg">
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-lg font-bold text-foreground">
                Protocolo: {solicitacao.protocolo}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadExternalPdf(solicitacao, {
                includeChecklist: true,
                aprovacaoAtivada: aprovacaoAdministrativo || aprovacaoOperacional,
                aprovacaoAdministrativo,
                aprovacaoOperacional,
                deferimentoStatus: generalStatus,
                observacoes,
                statusLabels,
                etapasConfig,
                servicoConfig: servicoConfig || undefined,
                lacreArmadorDados: lacreArmadorDados || undefined,
                lacreArmadorConfig: lacreArmadorConfig || undefined,
                showDeferimento,
                showLacreArmador,
              })} title="Baixar PDF">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <Separator className="my-1" />
            <div className={`inline-flex items-center px-3 py-1 rounded-md border text-sm font-medium ${getStatusColor(solicitacao.status)}`}>
              {solicitacao.status === "vistoria_finalizada" && isPositionamento
                ? <span className="status-badge">Serviço Concluído</span>
                : <StatusBadge status={solicitacao.status} />
              }
            </div>

            {/* Motivo da recusa - visível na consulta pública */}
            {solicitacao.status === "recusado" && observacoes && observacoes.length > 0 && (
              <Alert className="mt-2 border-red-500 bg-red-50">
                <X className="h-4 w-4 text-red-600" />
                <AlertDescription className="ml-2">
                  <span className="font-semibold text-red-700">Motivo da Recusa</span>
                  <p className="text-sm text-red-600 mt-1">{observacoes[0]?.observacao || "Solicitação recusada pela equipe interna."}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Pendências sub-status */}
            {solicitacao.status === "vistoriado_com_pendencia" && solicitacao.pendencias_selecionadas && solicitacao.pendencias_selecionadas.length > 0 && (
              <div className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 mt-1">
                Pendências: {solicitacao.pendencias_selecionadas.join(", ")}
              </div>
            )}

            {/* Cancel button or pending cancel message */}
            {cancelamentoSolicitado && solicitacao.status !== "cancelado" && (
              <Alert className="mt-2 border-amber-400 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="ml-2 text-sm text-amber-700">
                  Cancelamento solicitado. Aguardando confirmação da equipe interna.
                </AlertDescription>
              </Alert>
            )}
            {canCancel && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/50 hover:bg-destructive/10 text-xs"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Se deseja cancelar a solicitação clique aqui
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Fluxo de Etapas */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Progresso do Processo</p>
            <ProcessStageStepper
              status={solicitacao.status}
              comexAprovado={solicitacao.comex_aprovado ?? undefined}
              armazemAprovado={solicitacao.armazem_aprovado ?? undefined}
              aprovacaoAtivada={aprovacaoAdministrativo || aprovacaoOperacional}
              aprovacaoAdministrativo={aprovacaoAdministrativo}
              aprovacaoOperacional={aprovacaoOperacional}
              solicitarDeferimento={showDeferimento}
              deferimentoStatus={showDeferimento ? generalStatus : null}
              statusLabels={statusLabels}
              categoria={solicitacao.categoria}
              tipoOperacao={solicitacao.tipo_operacao}
              pendenciasSelecionadas={solicitacao.pendencias_selecionadas}
              observacoes={observacoes?.map(o => o.observacao)}
              etapasConfig={etapasConfig}
              custoposicionamento={(solicitacao as any).custo_posicionamento ?? null}
              motivoRecusa={
                solicitacao.armazem_aprovado === false
                  ? (solicitacao as any).armazem_justificativa
                  : (solicitacao as any).comex_justificativa
              }
            />
          </div>

          {/* Checklist */}
          <ProcessChecklist
            solicitacao={{...solicitacao, solicitar_deferimento: showDeferimento, observacoes: observacoes?.[0]?.observacao || null, armazem_justificativa: (solicitacao as any).armazem_justificativa, comex_justificativa: (solicitacao as any).comex_justificativa} as any}
            aprovacaoAtivada={aprovacaoAdministrativo || aprovacaoOperacional}
            aprovacaoAdministrativo={aprovacaoAdministrativo}
            aprovacaoOperacional={aprovacaoOperacional}
            deferimentoStatus={showDeferimento ? generalStatus : null}
            compact
            hideInternal
            serviceName={solicitacao.tipo_operacao || servicoConfig?.nome || undefined}
            etapasConfig={etapasConfig}
          />

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {infoItems.map((item, i) => (
              <InfoItem key={i} icon={item.icon} label={item.label} value={item.value} />
            ))}
          </div>

          {/* Respostas e anexos do formulário são exibidos apenas na página interna */}

          {/* Acompanhamento removido - uso interno apenas */}

          {/* Lacre Armador Section - Mini-form & Sub-timeline */}
          {showLacreArmador && (
            <>
              <Separator />
              <div className="space-y-4">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  {lacreArmadorConfig?.titulo_externo || "Regularização de Lacre Armador"}
                </p>

                {/* Sub-timeline do lacre */}
                <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
                  {(() => {
                    const statusOrder = ["aguardando_preenchimento", "aguardando_confirmacao", "posicionamento_confirmado", "aguardando_lacre", "servico_concluido"];
                    const currentIdx = statusOrder.indexOf(lacreCurrentStatus);
                    const isRecusado = lacreCurrentStatus === "recusado";

                    // Build visible steps with replacement logic:
                    // - "aguardando_confirmacao" is replaced by "posicionamento_confirmado" once reached
                    // - "aguardando_lacre" is replaced by "Lacre Armador Inserido" when servico_concluido
                    const allSteps = [
                      { key: "aguardando_preenchimento", label: "Preencher Dados" },
                      // Slot 2: show "Aguardando Confirmação" only if not yet past it
                      currentIdx >= statusOrder.indexOf("posicionamento_confirmado")
                        ? { key: "posicionamento_confirmado", label: "Posicionamento Confirmado" }
                        : currentIdx === statusOrder.indexOf("aguardando_confirmacao")
                          ? { key: "aguardando_confirmacao", label: "Aguardando Confirmação" }
                          : { key: "aguardando_confirmacao", label: "Aguardando Confirmação" },
                      // Slot 3: show "Aguardando Lacre" or "Lacre Armador Inserido"
                      currentIdx >= statusOrder.indexOf("servico_concluido")
                        ? { key: "lacre_inserido", label: "Lacre Armador Inserido" }
                        : currentIdx === statusOrder.indexOf("aguardando_lacre")
                          ? { key: "aguardando_lacre", label: "Aguardando Lacre" }
                          : { key: "aguardando_lacre", label: "Aguardando Lacre" },
                      { key: "servico_concluido", label: "Serviço Concluído" },
                    ];

                    // Remove "posicionamento_confirmado" from its original slot since it replaced aguardando_confirmacao
                    // and remove "aguardando_lacre" original when replaced by lacre_inserido
                    // The allSteps already handles replacements, so just render them

                    // Determine colors for each visible step
                    const getStepColor = (step: { key: string }, stepPosition: number) => {
                      if (isRecusado && stepPosition === 0) {
                        return "bg-red-100 text-red-700 border border-red-300";
                      }
                      // Map position back to logical progression
                      const positionToOrder: Record<number, number> = { 0: 0, 1: currentIdx >= 2 ? 2 : 1, 2: currentIdx >= 4 ? 4 : 3, 3: 4 };
                      const logicalIdx = positionToOrder[stepPosition] ?? stepPosition;

                      if (logicalIdx < currentIdx) {
                        return "bg-green-100 text-green-700 border border-green-300";
                      }
                      if (logicalIdx === currentIdx) {
                        if (step.key === "aguardando_confirmacao") return "bg-blue-100 text-blue-700 border border-blue-300";
                        if (step.key === "posicionamento_confirmado" || step.key === "servico_concluido" || step.key === "lacre_inserido") return "bg-green-100 text-green-700 border border-green-300";
                        return "bg-amber-100 text-amber-700 border border-amber-300";
                      }
                      return "bg-muted text-muted-foreground";
                    };

                    return allSteps.map((step, i) => (
                      <div key={step.key} className="flex items-center gap-1 shrink-0">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${getStepColor(step, i)}`}>
                          {step.label}
                        </span>
                        {i < allSteps.length - 1 && <span className="text-muted-foreground">→</span>}
                      </div>
                    ));
                  })()}
                </div>

                {/* Cost warning */}
                {/* Mensagem de custo do lacre - respeita is_active */}
                {lacreArmadorConfig?.mensagem_custo && (
                  <Alert className="border-amber-400 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="ml-2 text-sm text-amber-700">
                      {lacreArmadorConfig.mensagem_custo}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botão Ciente - apenas quando tipo_aceite é "aceite" ou "aceite_custo" */}
                {lacreArmadorConfig?.tipo_aceite && lacreArmadorConfig.tipo_aceite !== "informativo" && (
                  solicitacao.lacre_armador_aceite_custo ? (
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded px-3 py-2 border border-green-300">
                      <Check className="h-4 w-4" />
                      <span className="font-medium">Aceite confirmado</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-500 text-amber-700 hover:bg-amber-100"
                      onClick={async () => {
                        try {
                          const { error } = await supabase.functions.invoke("upload-publico", {
                            body: { action: "aceite_custo_lacre", solicitacao_id: solicitacao.id },
                          });
                          if (error) throw error;
                          toast.success("Aceite registrado com sucesso.");
                          onRefresh();
                        } catch {
                          toast.error("Erro ao registrar aceite.");
                        }
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Ciente
                    </Button>
                  )
                )}

                {/* Recusa warning */}
                {lacreCurrentStatus === "recusado" && lacreArmadorDados?.motivo_recusa && (
                  <Alert className="border-red-500 bg-red-50">
                    <X className="h-4 w-4 text-red-600" />
                    <AlertDescription className="ml-2">
                      <span className="font-semibold text-red-700">Solicitação recusada</span>
                      <p className="text-sm text-red-600 mt-1"><strong>Motivo:</strong> {lacreArmadorDados.motivo_recusa}</p>
                      <p className="text-xs text-red-500 mt-1">Preencha novamente os dados para reenviar.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Mini-form - show when needs filling */}
                {canFillLacreForm && (
                  <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Data do Posicionamento</Label>
                        <Input type="date" value={lacreDataPos} onChange={(e) => setLacreDataPos(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Período</Label>
                        <select value={lacrePeriodo} onChange={(e) => setLacrePeriodo(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="">Selecione...</option>
                          {lacreArmadorConfig?.periodo_manha_ativo !== false && <option value="manha">Manhã</option>}
                          {lacreArmadorConfig?.periodo_tarde_ativo !== false && <option value="tarde">Tarde</option>}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1"><User className="h-3.5 w-3.5" /> Nome do Responsável</Label>
                      <Input value={lacreResponsavel} onChange={(e) => setLacreResponsavel(e.target.value)} placeholder="Nome completo" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Telefone</Label>
                        <Input type="tel" value={lacreTelefone} onChange={(e) => setLacreTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> E-mail de Contato</Label>
                        <Input type="email" value={lacreEmail} onChange={(e) => setLacreEmail(e.target.value)} placeholder="email@exemplo.com" />
                      </div>
                    </div>

                    <Button
                      size="sm"
                      disabled={!lacreDataPos || !lacrePeriodo || !lacreResponsavel.trim()}
                      onClick={() => setShowLacreConfirmDialog(true)}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Enviar Solicitação de Posicionamento
                    </Button>
                  </div>
                )}

                {/* Status messages based on lacre_status */}
                {lacreCurrentStatus === "aguardando_confirmacao" && (
                  <Alert className="border-blue-400 bg-blue-50">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="ml-2">
                      <span className="font-semibold text-blue-700">Aguardando Confirmação</span>
                      <p className="text-sm text-blue-600 mt-1">Dados enviados. Aguardando confirmação do posicionamento pela equipe.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {lacreCurrentStatus === "posicionamento_confirmado" && (
                  <Alert className="border-green-500 bg-green-50">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="ml-2">
                      <span className="font-semibold text-green-700">Posicionamento Confirmado</span>
                      <p className="text-sm text-green-600 mt-1">O posicionamento para inclusão do lacre foi confirmado.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {lacreCurrentStatus === "aguardando_lacre" && (
                  <Alert className="border-amber-400 bg-amber-50">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="ml-2">
                      <span className="font-semibold text-amber-700">Aguardando Lacre</span>
                      <p className="text-sm text-amber-600 mt-1">Aguardando a inclusão do lacre armador no contêiner.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {lacreCurrentStatus === "servico_concluido" && (
                  <Alert className="border-green-500 bg-green-50">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="ml-2">
                      <span className="font-semibold text-green-700">Serviço Concluído</span>
                      <p className="text-sm text-green-600 mt-1">Lacre armador incluído com sucesso.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Show submitted data summary when not in fill mode */}
                {!canFillLacreForm && lacreArmadorDados && lacreCurrentStatus !== "aguardando_preenchimento" && (
                  <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1 border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Dados Informados</p>
                    <p><strong>Lacre coletado:</strong> {lacreArmadorDados.lacre_coletado ? "Sim" : "Não"}</p>
                    {lacreArmadorDados.data_posicionamento_lacre && (
                      <p><strong>Data:</strong> {new Date(lacreArmadorDados.data_posicionamento_lacre + "T00:00:00").toLocaleDateString("pt-BR")} — {lacreArmadorDados.periodo_lacre === "manha" ? "Manhã" : "Tarde"}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {showDeferimento && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  {deferimentoTitulo || "Deferimento"}
                </p>
                {getDeferimentoStatusSection()}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação com preview */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Confirmar Envio do Deferimento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verifique se o arquivo abaixo está correto antes de enviar:
            </p>
            
            {previewFile && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-sm font-medium mb-3">{previewFile.file.name}</p>
                {previewFile.file.type === "application/pdf" ? (
                  <iframe 
                    src={previewFile.url} 
                    className="w-full h-[300px] rounded border" 
                    title="Preview do PDF"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <img 
                    src={previewFile.url} 
                    alt="Preview" 
                    className="max-w-full max-h-[300px] mx-auto rounded border"
                  />
                )}
              </div>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Certifique-se de que este é o documento correto. Após o envio, o arquivo será 
                analisado pela equipe.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelUpload} disabled={uploading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleConfirmUpload} disabled={uploading} className="jbs-btn-primary">
              {uploading ? (
                "Enviando..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar e Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de cancelamento */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Cancelamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja cancelar esta solicitação?
            </p>
            {solicitacao.status !== "aguardando_confirmacao" && (
              <Alert className="border-amber-400 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="ml-2 text-sm text-amber-700">
                  Como a solicitação já foi confirmada, a equipe avaliará possíveis custos operacionais antes da efetivação do cancelamento.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={cancelling}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancelSolicitacao} disabled={cancelling}>
              {cancelling ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação do lacre */}
      <Dialog open={showLacreConfirmDialog} onOpenChange={setShowLacreConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              Dados do Lacre Armador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(lacreArmadorConfig as any)?.lacre_coletado_ativo !== false && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Lacre Armador coletado?</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="lacre_coletado_dialog" checked={lacreColetado === true} onChange={() => setLacreColetado(true)} className="accent-amber-600" />
                    <span className="text-sm">Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="lacre_coletado_dialog" checked={lacreColetado === false} onChange={() => setLacreColetado(false)} className="accent-amber-600" />
                    <span className="text-sm">Não</span>
                  </label>
                </div>
              </div>
            )}

            {lacreArmadorConfig?.anexo_ativo !== false && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> RIC do novo lacre com imagem do novo lacre</Label>
                <Input type="file" accept="image/jpeg,image/png" onChange={(e) => setLacreFotoFile(e.target.files?.[0] || null)} className="text-sm" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLacreConfirmDialog(false)} disabled={savingLacre}>
              Cancelar
            </Button>
            <Button
              disabled={savingLacre || ((lacreArmadorConfig as any)?.lacre_coletado_ativo !== false && lacreColetado === null)}
              onClick={async () => {
                setSavingLacre(true);
                try {
                  if (lacreFotoFile) {
                    const formData = new FormData();
                    formData.append("file", lacreFotoFile);
                    formData.append("bucket", "deferimento");
                    formData.append("solicitacao_id", solicitacao.id);
                    formData.append("document_type", "lacre_foto");
                    const { error: uploadErr } = await supabase.functions.invoke("upload-publico", { body: formData });
                    if (uploadErr) throw uploadErr;
                  }
                  const { error } = await supabase.functions.invoke("upload-publico", {
                    body: {
                      action: "submit_lacre_form",
                      solicitacao_id: solicitacao.id,
                      lacre_coletado: lacreColetado,
                      data_posicionamento_lacre: lacreDataPos,
                      periodo_lacre: lacrePeriodo,
                      responsavel_nome: lacreResponsavel,
                      responsavel_telefone: lacreTelefone,
                      responsavel_email: lacreEmail,
                    },
                  });
                  if (error) throw error;
                  toast.success("Dados enviados! Aguardando confirmação.");
                  setShowLacreConfirmDialog(false);
                  onRefresh();
                } catch {
                  toast.error("Erro ao enviar dados do lacre.");
                } finally {
                  setSavingLacre(false);
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {savingLacre ? "Enviando..." : "Salvar e Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground mt-0.5">{icon}</span>
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  </div>
);

export default ConsultaResultado;

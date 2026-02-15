import { useState } from "react";
import { Upload, FileText, Calendar, Package, User, Check, X, Clock, Eye, AlertTriangle, Download, Lock } from "lucide-react";
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
  onRefresh: () => void;
}

const ConsultaResultado = ({ solicitacao, deferimentoDocs = [], servicoConfig = null, observacoes = [], statusLabels = [], etapasConfig = [], lacreArmadorConfig = null, onRefresh }: ConsultaResultadoProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [lacreArmadorPossui, setLacreArmadorPossui] = useState<boolean | null>(solicitacao.lacre_armador_possui ?? null);
  const [lacreDataPosicionamento, setLacreDataPosicionamento] = useState("");
  const [savingLacre, setSavingLacre] = useState(false);

  const aprovacaoAdministrativo = servicoConfig?.aprovacao_administrativo ?? false;
  const aprovacaoOperacional = servicoConfig?.aprovacao_operacional ?? false;

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

  // Lacre Armador status
  const getGeneralLacreStatus = (): "recebido" | "recusado" | "aguardando" | null => {
    if (lacreDocs.length === 0) return null;
    const hasPendente = lacreDocs.some(d => d.status === "pendente" || d.status === "aguardando");
    if (hasPendente) return "aguardando";
    const hasAceito = lacreDocs.some(d => d.status === "aceito");
    if (hasAceito) return "recebido";
    const hasRecusado = lacreDocs.some(d => d.status === "recusado");
    if (hasRecusado) return "recusado";
    return "aguardando";
  };
  const lacreStatus = getGeneralLacreStatus();

  // Lacre armador visibility
  const isServicePosicionamentoLacre = (solicitacao.tipo_operacao || "").toLowerCase().includes("posicionamento");
  const statusInLacreActivation = servicoConfig?.lacre_armador_status_ativacao?.includes(solicitacao.status) ?? false;
  const showLacreArmador = isServicePosicionamentoLacre && statusInLacreActivation && (solicitacao as any).solicitar_lacre_armador === true;
  const canUploadLacre = showLacreArmador && (lacreDocs.length === 0 || lacreStatus === "recusado") && lacreStatus !== "aguardando";

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

  // Show deferimento only when ALL 3 conditions are met:
  // 1. Service = Posicionamento
  // 2. Current status is in deferimento_status_ativacao list
  // 3. solicitar_deferimento toggle is active on the process
  const isServicePosicionamento = (solicitacao.tipo_operacao || "").toLowerCase().includes("posicionamento");
  const statusInDeferimentoActivation = servicoConfig?.deferimento_status_ativacao?.includes(solicitacao.status) ?? false;
  const showDeferimento = isServicePosicionamento && statusInDeferimentoActivation && solicitacao.solicitar_deferimento === true;
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
    return "text-yellow-700 bg-yellow-50 border-yellow-200";
  };

  const infoItems = [
    solicitacao.lpco ? { icon: <FileText className="h-4 w-4" />, label: "LPCO", value: solicitacao.lpco } : null,
    solicitacao.numero_conteiner ? { icon: <Package className="h-4 w-4" />, label: "Contêiner", value: solicitacao.numero_conteiner } : null,
    { icon: <Calendar className="h-4 w-4" />, label: getDateLabel(), value: getDateValue() !== "—" ? getDateValue() : null },
    solicitacao.tipo_carga ? { icon: <Package className="h-4 w-4" />, label: "Tipo de Carga", value: formattedTipoCarga } : null,
    solicitacao.tipo_operacao ? { icon: <FileText className="h-4 w-4" />, label: "Serviço solicitado", value: solicitacao.tipo_operacao } : null,
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
              <Button variant="outline" size="sm" onClick={() => downloadExternalPdf(solicitacao, { includeChecklist: true, aprovacaoAtivada: aprovacaoAdministrativo || aprovacaoOperacional, deferimentoStatus: generalStatus })} title="Baixar PDF">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <Separator className="my-1" />
            <div className={`inline-flex items-center px-3 py-1 rounded-md border text-sm font-medium ${getStatusColor(solicitacao.status)}`}>
              <StatusBadge status={solicitacao.status} />
            </div>
            {/* Pendências sub-status */}
            {solicitacao.status === "vistoriado_com_pendencia" && solicitacao.pendencias_selecionadas && solicitacao.pendencias_selecionadas.length > 0 && (
              <div className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 mt-1">
                Pendências: {solicitacao.pendencias_selecionadas.join(", ")}
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
            />
          </div>

          {/* Checklist */}
          <ProcessChecklist
            solicitacao={{...solicitacao, solicitar_deferimento: showDeferimento, observacoes: observacoes?.[0]?.observacao || null} as any}
            aprovacaoAtivada={aprovacaoAdministrativo || aprovacaoOperacional}
            aprovacaoAdministrativo={aprovacaoAdministrativo}
            aprovacaoOperacional={aprovacaoOperacional}
            deferimentoStatus={showDeferimento ? generalStatus : null}
            compact
            hideInternal
            serviceName={solicitacao.tipo_operacao || undefined}
            etapasConfig={etapasConfig}
          />

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {infoItems.map((item, i) => (
              <InfoItem key={i} icon={item.icon} label={item.label} value={item.value} />
            ))}
          </div>

          {/* Observações (do histórico interno, visíveis externamente) */}
          {observacoes.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Acompanhamento
                </p>
                <div className="space-y-2">
                  {observacoes.map((obs, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 border">
                      <p className="text-sm">{obs.observacao}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(obs.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Lacre Armador Section - before deferimento */}
          {showLacreArmador && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  {lacreArmadorConfig?.titulo_externo || "Regularização de Lacre Armador"}
                </p>

                {/* Form fields: possui lacre + data posicionamento */}
                {lacreStatus !== "recebido" && lacreStatus !== "aguardando" && (
                  <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Já possui Lacre Armador?</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="lacre_possui"
                            checked={lacreArmadorPossui === true}
                            onChange={() => setLacreArmadorPossui(true)}
                            className="accent-amber-600"
                          />
                          <span className="text-sm">Sim</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="lacre_possui"
                            checked={lacreArmadorPossui === false}
                            onChange={() => setLacreArmadorPossui(false)}
                            className="accent-amber-600"
                          />
                          <span className="text-sm">Não</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Data de Posicionamento para Inclusão do Lacre</Label>
                      <Input
                        type="date"
                        value={lacreDataPosicionamento}
                        onChange={(e) => setLacreDataPosicionamento(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>

                    <Button
                      size="sm"
                      disabled={savingLacre || lacreArmadorPossui === null || !lacreDataPosicionamento}
                      onClick={async () => {
                        setSavingLacre(true);
                        try {
                          const { error } = await supabase.functions.invoke("upload-publico", {
                            body: {
                              action: "update_lacre_info",
                              solicitacao_id: solicitacao.id,
                              lacre_armador_possui: lacreArmadorPossui,
                              data_posicionamento: lacreDataPosicionamento,
                            },
                          });
                          if (error) throw error;
                          toast.success("Informações do lacre salvas com sucesso!");
                          onRefresh();
                        } catch {
                          toast.error("Erro ao salvar informações do lacre.");
                        } finally {
                          setSavingLacre(false);
                        }
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {savingLacre ? "Salvando..." : "Confirmar Informações"}
                    </Button>
                  </div>
                )}

                {/* Cost warning - only if internal marked cost as "Sim" */}
                {(solicitacao as any).lacre_armador_aceite_custo === true && lacreArmadorConfig?.mensagem_custo && (
                  <Alert className="border-amber-400 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="ml-2 text-sm text-amber-700">
                      {lacreArmadorConfig.mensagem_custo}
                    </AlertDescription>
                  </Alert>
                )}

                {lacreStatus === "recebido" ? (
                  <Alert className="border-green-500 bg-green-50">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="ml-2">
                      <span className="font-semibold text-green-700">Lacre Armador Recebido</span>
                      <p className="text-sm text-green-600 mt-1">Documento aprovado.</p>
                    </AlertDescription>
                  </Alert>
                ) : lacreStatus === "recusado" ? (
                  <div className="space-y-3">
                    <Alert className="border-red-500 bg-red-50">
                      <X className="h-4 w-4 text-red-600" />
                      <AlertDescription className="ml-2">
                        <span className="font-semibold text-red-700">Reenviar documento de lacre armador</span>
                        {lacreDocs.find(d => d.status === "recusado")?.motivo_recusa && (
                          <p className="text-sm text-red-600 mt-1"><strong>Motivo:</strong> {lacreDocs.find(d => d.status === "recusado")?.motivo_recusa}</p>
                        )}
                      </AlertDescription>
                    </Alert>
                    <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                      <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const uploadLacre = async () => {
                          setUploading(true);
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("bucket", "deferimento");
                            formData.append("solicitacao_id", solicitacao.id);
                            formData.append("document_type", "lacre_armador");
                            const { error } = await supabase.functions.invoke("upload-publico", { body: formData });
                            if (error) throw error;
                            toast.success("Documento de lacre enviado!");
                            onRefresh();
                          } catch { toast.error("Erro ao enviar documento."); }
                          finally { setUploading(false); }
                        };
                        uploadLacre();
                      }} disabled={uploading} className="text-sm border-red-300" />
                    </div>
                  </div>
                ) : lacreStatus === "aguardando" ? (
                  <Alert className="border-yellow-500 bg-yellow-50">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="ml-2">
                      <span className="font-semibold text-yellow-700">Aguardando Atendimento</span>
                      <p className="text-sm text-yellow-600 mt-1">Documento enviado. Aguardando análise.</p>
                    </AlertDescription>
                  </Alert>
                ) : canUploadLacre ? (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                    <p className="text-xs text-amber-600 mb-3">Envie o documento de lacre armador (PDF, JPG ou PNG).</p>
                    <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const uploadLacre = async () => {
                        setUploading(true);
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("bucket", "deferimento");
                          formData.append("solicitacao_id", solicitacao.id);
                          formData.append("document_type", "lacre_armador");
                          const { error } = await supabase.functions.invoke("upload-publico", { body: formData });
                          if (error) throw error;
                          toast.success("Documento de lacre enviado!");
                          onRefresh();
                        } catch { toast.error("Erro ao enviar documento."); }
                        finally { setUploading(false); }
                      };
                      uploadLacre();
                    }} disabled={uploading} className="text-sm border-amber-300" />
                  </div>
                ) : null}
              </div>
            </>
          )}

          {showDeferimento && (
            <>
              <Separator />
              {getDeferimentoStatusSection()}
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

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildNotificarStatusPayload } from "@/lib/edgePayload";
import StatusBadge from "./StatusBadge";
import ProcessStageStepper from "./ProcessStageStepper";
import ProcessChecklist from "./ProcessChecklist";
import { FileText, Download, Eye, CheckCircle, XCircle, RefreshCw, ClipboardList } from "lucide-react";
import { formatTipoCarga } from "@/lib/tipoCarga";
import { normalizeFormValue } from "@/lib/normalizeFormValue";

interface ProcessoViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao: any;
  isAdmin: boolean;
  userId: string;
  onUpdate: () => void;
}

const ProcessoViewDialog = ({ open, onOpenChange, solicitacao, isAdmin, userId, onUpdate }: ProcessoViewDialogProps) => {
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<'aprovado' | 'reprovado' | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aprovacaoAtivada, setAprovacaoAtivada] = useState(false);
  const [aprovacaoAdministrativo, setAprovacaoAdministrativo] = useState(false);
  const [aprovacaoOperacional, setAprovacaoOperacional] = useState(false);
  const [deferimentoStatus, setDeferimentoStatus] = useState<"recebido" | "recusado" | "aguardando" | null>(null);
  const [servicoNome, setServicoNome] = useState<string | undefined>(undefined);
  const [camposDinamicos, setCamposDinamicos] = useState<{ nome: string; valor: string }[]>([]);
  const [formRespostas, setFormRespostas] = useState<{ rotulo: string; valor: any; tipo: string; config?: any }[]>([]);
  const [formArquivos, setFormArquivos] = useState<{ pergunta_id: string; file_url: string; file_name: string }[]>([]);
  const [isExternalForm, setIsExternalForm] = useState(false);

  useEffect(() => {
    if (open && solicitacao) {
      fetchAttachments();
      fetchServicoConfig();
      fetchCamposDinamicos();
      fetchFormRespostas();
      checkIfExternalForm();
    }
  }, [open, solicitacao]);

  const checkIfExternalForm = async () => {
    const formularioId = solicitacao.formulario_id;
    if (!formularioId) {
      setIsExternalForm(false);
      return;
    }
    const { data } = await supabase
      .from("external_buttons")
      .select("id, tipo")
      .eq("formulario_id", formularioId)
      .maybeSingle();
    setIsExternalForm(!!data);
  };

  const fetchAttachments = async () => {
    const { data } = await supabase
      .from("deferimento_documents")
      .select("*")
      .eq("solicitacao_id", solicitacao.id);
    
    setAttachments(data || []);

    const defDocs = (data || []).filter((d: any) => d.document_type === "deferimento" || !d.document_type);
    if (defDocs.length === 0) {
      setDeferimentoStatus(null);
    } else if (defDocs.some((d: any) => d.status === "recusado")) {
      setDeferimentoStatus("recusado");
    } else if (defDocs.every((d: any) => d.status === "aceito")) {
      setDeferimentoStatus("recebido");
    } else {
      setDeferimentoStatus("aguardando");
    }
  };

  const fetchServicoConfig = async () => {
    const tipoOperacao = solicitacao?.tipo_operacao || "Posicionamento";
    const { data } = await supabase
      .from("servicos")
      .select("nome, aprovacao_ativada, aprovacao_administrativo, aprovacao_operacional")
      .eq("nome", tipoOperacao)
      .maybeSingle();
    setServicoNome(data?.nome || undefined);
    setAprovacaoAtivada(data?.aprovacao_ativada ?? false);
    setAprovacaoAdministrativo((data as any)?.aprovacao_administrativo ?? false);
    setAprovacaoOperacional((data as any)?.aprovacao_operacional ?? false);
  };

  const fetchCamposDinamicos = async () => {
    const { data: valores } = await supabase
      .from("campos_analise_valores")
      .select("campo_id, valor, campos_analise(nome)")
      .eq("solicitacao_id", solicitacao.id);

    if (valores) {
      setCamposDinamicos(
        valores.map((v: any) => ({
          nome: v.campos_analise?.nome || "Campo",
          valor: v.valor || "—",
        }))
      );
    }
  };

  const fetchFormRespostas = async () => {
    const formularioId = solicitacao.formulario_id;
    if (!formularioId) {
      setFormRespostas([]);
      setFormArquivos([]);
      return;
    }

    const [{ data: respostas }, { data: perguntasData }, { data: mapeamentos }] = await Promise.all([
      supabase
        .from("formulario_respostas")
        .select("respostas, arquivos, created_at")
        .eq("formulario_id", formularioId)
        .order("created_at", { ascending: false }),
      supabase
        .from("formulario_perguntas")
        .select("pergunta_id, banco_perguntas(id, rotulo, tipo, config)")
        .eq("formulario_id", formularioId)
        .order("ordem"),
      supabase
        .from("pergunta_mapeamento")
        .select("pergunta_id, campo_solicitacao, campo_analise_id")
        .eq("formulario_id", formularioId),
    ]);

    if (!respostas || respostas.length === 0 || !perguntasData) {
      setFormRespostas([]);
      setFormArquivos([]);
      return;
    }

    // Find response closest to solicitacao creation
    const solCreatedAt = new Date(solicitacao.created_at).getTime();
    let bestResponse = respostas[0];
    let bestDiff = Math.abs(new Date(respostas[0].created_at).getTime() - solCreatedAt);
    for (const r of respostas) {
      const diff = Math.abs(new Date(r.created_at).getTime() - solCreatedAt);
      if (diff < bestDiff) { bestDiff = diff; bestResponse = r; }
    }

    const respostasObj = bestResponse.respostas as Record<string, any>;
    const mappedPerguntaIds = new Set((mapeamentos || []).map(m => m.pergunta_id));

    const unmapped: { rotulo: string; valor: any; tipo: string; config?: any }[] = [];
    for (const fp of perguntasData) {
      const bp = (fp as any).banco_perguntas;
      if (!bp) continue;
      if (bp.tipo === "informativo" || bp.tipo === "subtitulo") continue;
      if (isExternalForm && mappedPerguntaIds.has(bp.id)) continue;

      const val = respostasObj[bp.id];
      if (val !== undefined && val !== null && val !== "") {
        unmapped.push({ rotulo: bp.rotulo, valor: val, tipo: bp.tipo, config: bp.config });
      }
    }
    setFormRespostas(unmapped);

    // Process attachments with signed URLs
    const rawArquivos = (bestResponse.arquivos as any[]) || [];
    const signedArquivos: { pergunta_id: string; file_url: string; file_name: string }[] = [];
    for (const arq of rawArquivos) {
      let signedUrl = arq.file_url;
      if (arq.file_url && !arq.file_url.startsWith("http")) {
        const { data: signedData } = await supabase.storage.from("form-uploads").createSignedUrl(arq.file_url, 3600);
        if (signedData) signedUrl = signedData.signedUrl;
      }
      signedArquivos.push({ pergunta_id: arq.pergunta_id || "", file_url: signedUrl, file_name: arq.file_name || "Arquivo" });
    }
    setFormArquivos(signedArquivos);
  };

  const handleStatusChange = async () => {
    if (!justificativa.trim()) {
      toast.error("Justificativa é obrigatória para alteração de status");
      return;
    }

    setLoading(true);

    const targetStatus = newStatus === 'aprovado' ? 'confirmado_aguardando_vistoria' : 'recusado';

    const { data, error } = await supabase.functions.invoke("request_process_transition", {
      body: {
        solicitacao_id: solicitacao.id,
        current_status: solicitacao.status,
        target_status: targetStatus,
        justification: justificativa.trim(),
      },
    });

    if (error || data?.ok === false) {
      const msg = data?.error?.message || error?.message || "Erro ao alterar status";
      toast.error(msg);
    } else {
      supabase.functions.invoke("notificar-status", {
        body: buildNotificarStatusPayload({
          action: "notificar_status",
          solicitacao_id: solicitacao.id,
          novo_status: targetStatus,
          usuario_id: userId,
        }),
      }).catch(() => {});

      toast.success(`Status alterado para ${newStatus === 'aprovado' ? 'Aprovado' : 'Recusado'}`);
      setShowStatusChangeDialog(false);
      setJustificativa("");
      onUpdate();
    }

    setLoading(false);
  };

  const openPreview = (url: string) => {
    setPreviewUrl(url);
  };

  const formatResponseValue = (val: any, tipo: string, config?: any): string => {
    let result: string;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      if (val.campo1 && val.campo2) result = `${val.campo1} / ${val.campo2}`;
      else result = normalizeFormValue(val, { nullishFallback: "—", preserveObjects: true });
    } else {
      result = normalizeFormValue(val, { nullishFallback: "—" });
    }
    // Apply prefix/suffix from question config when displaying
    if (config && result !== "—") {
      const prefixo = config.prefixo || "";
      const sufixo = config.sufixo || "";
      if (prefixo || sufixo) {
        result = `${prefixo}${result}${sufixo ? " " + sufixo : ""}`;
      }
    }
    return result;
  };

  if (!solicitacao) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Processo {solicitacao.protocolo}
              <StatusBadge status={solicitacao.status} />
            </DialogTitle>
            <DialogDescription>
              Detalhes da solicitação e histórico de aprovações
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Fluxo de Etapas */}
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Progresso do Processo</p>
              <ProcessStageStepper
                status={solicitacao.status}
                comexAprovado={solicitacao.comex_aprovado}
                armazemAprovado={solicitacao.armazem_aprovado}
                aprovacaoAtivada={aprovacaoAtivada}
                aprovacaoAdministrativo={aprovacaoAdministrativo}
                aprovacaoOperacional={aprovacaoOperacional}
                solicitarDeferimento={solicitacao.solicitar_deferimento}
                deferimentoStatus={deferimentoStatus}
                categoria={(solicitacao as any).categoria}
                tipoOperacao={(solicitacao as any).tipo_operacao}
                custoposicionamento={(solicitacao as any).custo_posicionamento ?? null}
                motivoRecusa={
                  solicitacao.armazem_aprovado === false
                    ? solicitacao.armazem_justificativa
                    : solicitacao.comex_justificativa
                }
              />
            </div>

            {/* Checklist */}
            <ProcessChecklist
              solicitacao={solicitacao}
              aprovacaoAtivada={aprovacaoAtivada}
              aprovacaoAdministrativo={aprovacaoAdministrativo}
              aprovacaoOperacional={aprovacaoOperacional}
              deferimentoStatus={deferimentoStatus}
              serviceName={solicitacao.tipo_operacao || servicoNome}
            />

            <Separator />

            {/* Dados do Processo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Cliente</Label>
                <p className="font-medium">{solicitacao.cliente_nome}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <p className="text-sm">{solicitacao.cliente_email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Contêiner</Label>
                <p className="font-mono">{solicitacao.numero_conteiner || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">LPCO</Label>
                <p className="font-mono">{solicitacao.lpco || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo Carga</Label>
                <p>{formatTipoCarga(solicitacao.tipo_carga)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data Posicionamento</Label>
                <p>{solicitacao.data_posicionamento || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Serviço Adicional</Label>
                <p>{solicitacao.tipo_operacao || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status Vistoria</Label>
                <p>{solicitacao.status_vistoria || "—"}</p>
              </div>
              {solicitacao.cnpj && (
                <div>
                  <Label className="text-xs text-muted-foreground">CNPJ</Label>
                  <p className="font-mono">{solicitacao.cnpj}</p>
                </div>
              )}
              {solicitacao.categoria && (
                <div>
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <p>{solicitacao.categoria}</p>
                </div>
              )}
            </div>

            {/* Campos Dinâmicos de Análise */}
            {isExternalForm && camposDinamicos.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                    <ClipboardList className="h-4 w-4" />
                    Campos de Análise
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    {camposDinamicos.map((cd, i) => (
                      <div key={i}>
                        <Label className="text-xs text-muted-foreground">{cd.nome}</Label>
                        <p className="text-sm">{cd.valor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Respostas do Formulário (não mapeadas) */}
            {formRespostas.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4" />
                    Respostas do Formulário
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    {formRespostas.map((fr, i) => (
                      <div key={i}>
                        <Label className="text-xs text-muted-foreground">{fr.rotulo}</Label>
                        <p className="text-sm">{formatResponseValue(fr.valor, fr.tipo, fr.config)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {solicitacao.observacoes && (
              <div>
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <p className="text-sm bg-muted p-2 rounded">{solicitacao.observacoes}</p>
              </div>
            )}

            <Separator />

            {/* Status de Aprovação */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {solicitacao.comex_aprovado === true && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {solicitacao.comex_aprovado === false && <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="font-medium">Administrativo</span>
                </div>
                {solicitacao.comex_justificativa && (
                  <p className="text-xs text-muted-foreground">{solicitacao.comex_justificativa}</p>
                )}
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {solicitacao.armazem_aprovado === true && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {solicitacao.armazem_aprovado === false && <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="font-medium">Operacional</span>
                </div>
                {solicitacao.armazem_justificativa && (
                  <p className="text-xs text-muted-foreground">{solicitacao.armazem_justificativa}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Anexos do Formulário (form-uploads) - inline preview */}
            {formArquivos.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4" />
                    Anexos do Formulário
                  </Label>
                  <div className="space-y-2">
                    {formArquivos.map((arq, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{arq.file_name}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openPreview(arq.file_url)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={arq.file_url} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                        <div className="bg-muted/30 rounded overflow-hidden">
                          {arq.file_url?.toLowerCase().endsWith('.pdf') ? (
                            <iframe src={arq.file_url} className="w-full h-[200px]" title={arq.file_name} />
                          ) : (
                            <img src={arq.file_url} alt={arq.file_name} className="max-w-full max-h-[200px] mx-auto" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Anexos e Documentos (deferimento) */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4" />
                Anexos e Documentos
              </Label>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum anexo disponível</p>
              ) : (
                <div className="grid gap-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{att.file_name}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openPreview(att.file_url)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={att.file_url} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ações de Alteração de Status */}
            {isAdmin && (solicitacao.status === 'recusado' || solicitacao.status === 'confirmado_aguardando_vistoria') && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                    <RefreshCw className="h-4 w-4" />
                    Alterar Status do Processo
                  </Label>
                  <div className="flex gap-2">
                    {solicitacao.status === 'recusado' && (
                      <Button 
                        variant="outline" 
                        onClick={() => { setNewStatus('aprovado'); setShowStatusChangeDialog(true); }}
                        className="text-secondary border-secondary hover:bg-secondary/10"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Alterar para Aprovado
                      </Button>
                    )}
                    {solicitacao.status === 'confirmado_aguardando_vistoria' && (
                      <Button 
                        variant="outline"
                        onClick={() => { setNewStatus('reprovado'); setShowStatusChangeDialog(true); }}
                        className="text-destructive border-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Alterar para Recusado
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    A alteração de status requer uma justificativa obrigatória.
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Alteração de Status */}
      <Dialog open={showStatusChangeDialog} onOpenChange={setShowStatusChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alteração de Status</DialogTitle>
            <DialogDescription>
              Você está alterando o status de <strong>{solicitacao?.protocolo}</strong> para{" "}
              <strong>{newStatus === 'aprovado' ? 'Aprovado' : 'Recusado'}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Justificativa (obrigatória)</Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Informe o motivo da alteração..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusChangeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStatusChange} disabled={loading || !justificativa.trim()}>
              {loading ? "Salvando..." : "Confirmar Alteração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview de Anexo */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualização do Documento</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="w-full h-[70vh]">
              {previewUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewUrl} className="w-full h-full" />
              ) : (
                <img src={previewUrl} alt="Documento" className="max-w-full max-h-full mx-auto" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProcessoViewDialog;

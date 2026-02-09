import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import StatusBadge from "./StatusBadge";
import { FileText, Download, Eye, CheckCircle, XCircle, RefreshCw } from "lucide-react";

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

  // Fetch attachments when dialog opens
  useEffect(() => {
    if (open && solicitacao) {
      fetchAttachments();
    }
  }, [open, solicitacao]);

  const fetchAttachments = async () => {
    const { data } = await supabase
      .from("deferimento_documents")
      .select("*")
      .eq("solicitacao_id", solicitacao.id);
    
    setAttachments(data || []);
  };

  const handleStatusChange = async () => {
    if (!justificativa.trim()) {
      toast.error("Justificativa é obrigatória para alteração de status");
      return;
    }

    setLoading(true);

    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'aprovado') {
      updates.comex_aprovado = true;
      updates.armazem_aprovado = true;
      updates.comex_justificativa = justificativa;
      updates.armazem_justificativa = justificativa;
      updates.comex_usuario_id = userId;
      updates.armazem_usuario_id = userId;
      updates.comex_data = new Date().toISOString();
      updates.armazem_data = new Date().toISOString();
      updates.status = 'confirmado_aguardando_vistoria';
    } else if (newStatus === 'reprovado') {
      updates.comex_aprovado = false;
      updates.armazem_aprovado = false;
      updates.comex_justificativa = justificativa;
      updates.armazem_justificativa = justificativa;
      updates.comex_usuario_id = userId;
      updates.armazem_usuario_id = userId;
      updates.comex_data = new Date().toISOString();
      updates.armazem_data = new Date().toISOString();
      updates.status = 'recusado';
    }

    const { error } = await supabase
      .from("solicitacoes")
      .update(updates)
      .eq("id", solicitacao.id);

    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      // Log the action
      await supabase.from("audit_log").insert({
        usuario_id: userId,
        solicitacao_id: solicitacao.id,
        acao: newStatus === 'aprovado' ? 'status_alterado_aprovado' : 'status_alterado_recusado',
        detalhes: `Status alterado de ${solicitacao.status} para ${newStatus}. Justificativa: ${justificativa}`
      });

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
                <p>{solicitacao.tipo_carga || "—"}</p>
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
            </div>

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
                  <span className="font-medium">COMEX</span>
                </div>
                {solicitacao.comex_justificativa && (
                  <p className="text-xs text-muted-foreground">{solicitacao.comex_justificativa}</p>
                )}
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {solicitacao.armazem_aprovado === true && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {solicitacao.armazem_aprovado === false && <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="font-medium">ARMAZÉM</span>
                </div>
                {solicitacao.armazem_justificativa && (
                  <p className="text-xs text-muted-foreground">{solicitacao.armazem_justificativa}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Anexos */}
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

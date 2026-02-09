import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, FileText, Package, User, Calendar, Clock, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "./StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnaliseDialogProps {
  solicitacao: any;
  profile: { id: string; nome: string; setor: "COMEX" | "ARMAZEM" | null; email: string };
  userId: string;
  isAdmin?: boolean;
  onClose: () => void;
}

const AnaliseDialog = ({ solicitacao, profile, userId, isAdmin = false, onClose }: AnaliseDialogProps) => {
  const [justificativa, setJustificativa] = useState("");
  const [showRecusaConfirm, setShowRecusaConfirm] = useState(false);
  const [showAlteracaoConfirm, setShowAlteracaoConfirm] = useState(false);
  const [statusVistoria, setStatusVistoria] = useState(solicitacao.status_vistoria || "");
  const [loading, setLoading] = useState(false);
  const [adminSelectedSetor, setAdminSelectedSetor] = useState<"COMEX" | "ARMAZEM" | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttachments = async () => {
      const { data } = await supabase
        .from("deferimento_documents")
        .select("*")
        .eq("solicitacao_id", solicitacao.id);
      setAttachments(data || []);
    };
    fetchAttachments();
  }, [solicitacao.id]);

  const setor = isAdmin ? adminSelectedSetor : profile.setor;
  const isComex = setor === "COMEX";
  const isArmazem = setor === "ARMAZEM";

  const comexPending = solicitacao.comex_aprovado === null;
  const armazemPending = solicitacao.armazem_aprovado === null;

  const currentApproval = isComex ? solicitacao.comex_aprovado : isArmazem ? solicitacao.armazem_aprovado : null;
  const wasRefused = currentApproval === false;
  const alreadyApproved = currentApproval === true;

  const canDecide = solicitacao.status === "aguardando_confirmacao" && !alreadyApproved && setor !== null;
  const canChangeRefusal = wasRefused && solicitacao.status !== "recusado";

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

  const handleUpdateVistoria = async () => {
    if (!statusVistoria) return;
    setLoading(true);
    const { error } = await supabase
      .from("solicitacoes")
      .update({
        status_vistoria: statusVistoria,
        status: statusVistoria === "Vistoria Finalizada"
          ? "vistoria_finalizada" as any
          : statusVistoria === "Vistoriado com Pendência"
          ? "vistoriado_com_pendencia" as any
          : statusVistoria === "Não Vistoriado"
          ? "nao_vistoriado" as any
          : solicitacao.status,
      })
      .eq("id", solicitacao.id);

    if (error) {
      toast.error("Erro ao atualizar vistoria: " + error.message);
    } else {
      await logAudit("vistoria", `Status de vistoria atualizado para: ${statusVistoria}`);
      await createNotification(`Vistoria da solicitação ${solicitacao.protocolo}: ${statusVistoria}`, "vistoria");
      toast.success("Status de vistoria atualizado!");
      onClose();
    }
    setLoading(false);
  };

  const logAudit = async (acao: string, detalhes: string) => {
    await supabase.from("audit_log").insert({
      solicitacao_id: solicitacao.id,
      usuario_id: userId,
      acao,
      detalhes,
    });
  };

  const createNotification = async (mensagem: string, tipo: string) => {
    const { data: profiles } = await supabase.from("profiles").select("id");
    if (profiles) {
      const notifications = profiles.map((p) => ({
        usuario_id: p.id,
        solicitacao_id: solicitacao.id,
        mensagem,
        tipo,
      }));
      await supabase.from("notifications").insert(notifications);
    }
  };

  const getSetorLabel = (setor: string | null) => {
    if (!setor) return "—";
    const labels: Record<string, string> = {
      "COMEX": "Administrativo",
      "ARMAZEM": "Operacional",
    };
    return labels[setor] || setor;
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
              Análise e decisão sobre a solicitação de posicionamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoItem icon={<User className="h-4 w-4" />} label="Cliente" value={solicitacao.cliente_nome} />
              <InfoItem icon={<Package className="h-4 w-4" />} label="Contêiner" value={solicitacao.numero_conteiner || "—"} />
              <InfoItem icon={<FileText className="h-4 w-4" />} label="LPCO" value={solicitacao.lpco || "—"} />
              <InfoItem icon={<Calendar className="h-4 w-4" />} label="Data Posicionamento" value={solicitacao.data_posicionamento || "—"} />
              <InfoItem icon={<Clock className="h-4 w-4" />} label="Tipo Operação" value={solicitacao.tipo_operacao || "Posicionamento"} />
              <InfoItem icon={<Package className="h-4 w-4" />} label="Tipo Carga" value={solicitacao.tipo_carga || "—"} />
            </div>

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

            {/* Approval Status */}
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

            {/* Admin Sector Selection */}
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

            {/* Approval Actions */}
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

            {/* Vistoria */}
            {solicitacao.status === "confirmado_aguardando_vistoria" && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Atualizar Vistoria:</p>
                  <Select value={statusVistoria} onValueChange={setStatusVistoria}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status da vistoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vistoria Finalizada">Vistoria Finalizada</SelectItem>
                      <SelectItem value="Vistoriado com Pendência">Vistoriado com Pendência</SelectItem>
                      <SelectItem value="Não Vistoriado">Não Vistoriado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdateVistoria} disabled={loading || !statusVistoria} className="jbs-btn-primary">
                    Atualizar Vistoria
                  </Button>
                </div>
              </>
            )}

            {/* Anexos - Visualização embutida */}
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Anexos e Documentos ({attachments.length})
              </p>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum anexo disponível</p>
              ) : (
                <div className="space-y-4">
                  {attachments.map((att) => (
                    <div key={att.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{att.file_name}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={att.file_url} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" />
                            Baixar
                          </a>
                        </Button>
                      </div>
                      {/* Preview embutido */}
                      <div className="bg-muted/30 rounded overflow-hidden">
                        {att.file_url.toLowerCase().endsWith('.pdf') ? (
                          <iframe 
                            src={att.file_url} 
                            className="w-full h-[300px]" 
                            title={att.file_name}
                          />
                        ) : (
                          <img 
                            src={att.file_url} 
                            alt={att.file_name} 
                            className="max-w-full max-h-[300px] mx-auto"
                          />
                        )}
                      </div>
                    </div>
                  ))}
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
                Esta ação irá <strong>recusar</strong> o pedido de posicionamento e interromper o fluxo do processo.
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

export default AnaliseDialog;

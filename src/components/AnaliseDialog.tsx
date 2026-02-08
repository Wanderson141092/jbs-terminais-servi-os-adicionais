import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, FileText, Package, User, Calendar, Clock } from "lucide-react";
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

  const setor = isAdmin ? adminSelectedSetor : profile.setor;
  const isComex = setor === "COMEX";
  const isArmazem = setor === "ARMAZEM";

  // For admin: check both sectors
  const comexPending = solicitacao.comex_aprovado === null;
  const armazemPending = solicitacao.armazem_aprovado === null;
  const comexRefused = solicitacao.comex_aprovado === false;
  const armazemRefused = solicitacao.armazem_aprovado === false;

  // Check current approval state for selected sector
  const currentApproval = isComex ? solicitacao.comex_aprovado : isArmazem ? solicitacao.armazem_aprovado : null;
  const wasRefused = currentApproval === false;
  const alreadyApproved = currentApproval === true;

  // Can decide if status is aguardando OR if was previously refused (can change)
  const canDecide = solicitacao.status === "aguardando_confirmacao" && !alreadyApproved && setor !== null;
  const canChangeRefusal = wasRefused && solicitacao.status !== "recusado";

  const handleAprovar = async () => {
    // If changing from refused to approved, require justification
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

    // Log audit
    const detalhes = justificativa.trim() 
      ? `${logAction} pelo setor ${setor}. Justificativa: ${justificativa}`
      : `${logAction} pelo setor ${setor}`;

    await logAudit(logAction.toLowerCase(), detalhes);

    // Create notification
    const notifMsg = aprovado
      ? `Solicitação ${solicitacao.protocolo} aprovada pelo setor ${setor}`
      : `Solicitação ${solicitacao.protocolo} recusada pelo setor ${setor}: ${justificativa}`;

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
    // Notify all internal users
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
                label="COMEX"
                approved={solicitacao.comex_aprovado}
                justificativa={solicitacao.comex_justificativa}
                data={solicitacao.comex_data}
                isCurrentSetor={isComex}
              />
              <ApprovalCard
                label="ARMAZÉM"
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
                      COMEX {solicitacao.comex_aprovado === true && "(Aprovado)"}
                      {solicitacao.comex_aprovado === false && "(Recusado)"}
                    </Button>
                    <Button
                      variant={adminSelectedSetor === "ARMAZEM" ? "default" : "outline"}
                      onClick={() => setAdminSelectedSetor("ARMAZEM")}
                      disabled={solicitacao.armazem_aprovado === true}
                      className="flex-1"
                    >
                      ARMAZÉM {solicitacao.armazem_aprovado === true && "(Aprovado)"}
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
                    Sua decisão ({setor})
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
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
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmação de Alteração
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Este pedido foi <strong>anteriormente recusado</strong>. Você está alterando a decisão para <strong>Aprovado</strong>.
              </p>
              <div className="bg-muted p-3 rounded text-sm">
                <strong>Protocolo:</strong> {solicitacao.protocolo}<br />
                <strong>Justificativa:</strong> {justificativa}
              </div>
              <p className="text-orange-600 font-medium">
                Deseja realmente continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAlteracao} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Confirmar Aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

const ApprovalCard = ({ label, approved, justificativa, data, isCurrentSetor }: {
  label: string;
  approved: boolean | null;
  justificativa?: string | null;
  data?: string | null;
  isCurrentSetor: boolean;
}) => (
  <div className={`rounded-lg border-2 p-3 ${
    isCurrentSetor ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
  }`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      {isCurrentSetor && (
        <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded">
          Seu setor
        </span>
      )}
    </div>
    {approved === null || approved === undefined ? (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" /> Pendente
      </div>
    ) : approved ? (
      <div className="flex items-center gap-1 text-sm text-secondary">
        <CheckCircle2 className="h-4 w-4" /> Aprovado
      </div>
    ) : (
      <div>
        <div className="flex items-center gap-1 text-sm text-destructive">
          <XCircle className="h-4 w-4" /> Recusado
        </div>
        {justificativa && <p className="text-xs text-muted-foreground mt-1 italic">"{justificativa}"</p>}
      </div>
    )}
    {data && <p className="text-[10px] text-muted-foreground mt-1">{new Date(data).toLocaleString("pt-BR")}</p>}
  </div>
);

export default AnaliseDialog;

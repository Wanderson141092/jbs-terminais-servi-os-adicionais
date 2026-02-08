import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "./StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnaliseDialogProps {
  solicitacao: any;
  profile: any;
  userId: string;
  onClose: () => void;
}

const AnaliseDialog = ({ solicitacao, profile, userId, onClose }: AnaliseDialogProps) => {
  const [justificativa, setJustificativa] = useState("");
  const [showRecusaConfirm, setShowRecusaConfirm] = useState(false);
  const [statusVistoria, setStatusVistoria] = useState(solicitacao.status_vistoria || "");
  const [loading, setLoading] = useState(false);

  const setor = profile.setor;
  const isComex = setor === "COMEX";
  const isArmazem = setor === "ARMAZEM";

  const alreadyDecided = isComex
    ? solicitacao.comex_aprovado !== null
    : solicitacao.armazem_aprovado !== null;

  const canDecide = solicitacao.status === "aguardando_confirmacao" && !alreadyDecided;

  const handleAprovar = async () => {
    setLoading(true);
    const updateData = isComex
      ? { comex_aprovado: true, comex_usuario_id: userId, comex_data: new Date().toISOString() }
      : { armazem_aprovado: true, armazem_usuario_id: userId, armazem_data: new Date().toISOString() };

    const { error } = await supabase
      .from("solicitacoes")
      .update(updateData)
      .eq("id", solicitacao.id);

    if (error) {
      toast.error("Erro ao aprovar: " + error.message);
    } else {
      await logAudit("aprovacao", `Aprovado pelo setor ${setor}`);
      await createNotification(`Solicitação ${solicitacao.protocolo} aprovada pelo ${setor}.`, "aprovacao");
      toast.success("Solicitação aprovada!");
      onClose();
    }
    setLoading(false);
  };

  const handleRecusar = async () => {
    if (!justificativa.trim()) {
      toast.error("Justificativa é obrigatória para recusa.");
      return;
    }
    setShowRecusaConfirm(true);
  };

  const confirmRecusa = async () => {
    setLoading(true);
    const updateData = isComex
      ? { comex_aprovado: false, comex_usuario_id: userId, comex_justificativa: justificativa, comex_data: new Date().toISOString() }
      : { armazem_aprovado: false, armazem_usuario_id: userId, armazem_justificativa: justificativa, armazem_data: new Date().toISOString() };

    const { error } = await supabase
      .from("solicitacoes")
      .update(updateData)
      .eq("id", solicitacao.id);

    if (error) {
      toast.error("Erro ao recusar: " + error.message);
    } else {
      await logAudit("recusa", `Recusado pelo setor ${setor}. Justificativa: ${justificativa}`);
      await createNotification(`Solicitação ${solicitacao.protocolo} recusada pelo ${setor}. Motivo: ${justificativa}`, "recusa");
      toast.success("Solicitação recusada.");
      onClose();
    }
    setLoading(false);
    setShowRecusaConfirm(false);
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
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Cliente:</span> <strong>{solicitacao.cliente_nome}</strong></div>
              <div><span className="text-muted-foreground">E-mail:</span> <strong>{solicitacao.cliente_email}</strong></div>
              <div><span className="text-muted-foreground">LPCO:</span> <strong>{solicitacao.lpco || "—"}</strong></div>
              <div><span className="text-muted-foreground">Contêiner:</span> <strong>{solicitacao.numero_conteiner || "—"}</strong></div>
              <div><span className="text-muted-foreground">Data Posicionamento:</span> <strong>{solicitacao.data_posicionamento || "—"}</strong></div>
              <div><span className="text-muted-foreground">Tipo de Carga:</span> <strong>{solicitacao.tipo_carga || "—"}</strong></div>
            </div>

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
              />
              <ApprovalCard
                label="ARMAZÉM"
                approved={solicitacao.armazem_aprovado}
                justificativa={solicitacao.armazem_justificativa}
                data={solicitacao.armazem_data}
              />
            </div>

            {/* Approval Actions */}
            {canDecide && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Sua decisão ({setor}):</p>
                  <div>
                    <Label className="text-sm">Justificativa (obrigatória para recusa)</Label>
                    <Textarea
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      placeholder="Informe a justificativa..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleAprovar} disabled={loading} className="jbs-btn-secondary flex-1">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button onClick={handleRecusar} disabled={loading} variant="destructive" className="flex-1">
                      <XCircle className="h-4 w-4 mr-2" />
                      Recusar
                    </Button>
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
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRecusaConfirm} onOpenChange={setShowRecusaConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Recusa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja recusar a solicitação <strong>{solicitacao.protocolo}</strong>?
              <br /><br />
              <strong>Justificativa:</strong> {justificativa}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRecusa} className="bg-destructive text-destructive-foreground">
              Confirmar Recusa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const ApprovalCard = ({ label, approved, justificativa, data }: {
  label: string;
  approved: boolean | null;
  justificativa?: string | null;
  data?: string | null;
}) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
    {approved === null || approved === undefined ? (
      <p className="text-sm text-muted-foreground">Pendente</p>
    ) : approved ? (
      <div className="flex items-center gap-1 text-sm text-secondary">
        <CheckCircle2 className="h-4 w-4" /> Aprovado
      </div>
    ) : (
      <div>
        <div className="flex items-center gap-1 text-sm text-destructive">
          <XCircle className="h-4 w-4" /> Recusado
        </div>
        {justificativa && <p className="text-xs text-muted-foreground mt-1">{justificativa}</p>}
      </div>
    )}
    {data && <p className="text-[10px] text-muted-foreground mt-1">{new Date(data).toLocaleString("pt-BR")}</p>}
  </div>
);

export default AnaliseDialog;

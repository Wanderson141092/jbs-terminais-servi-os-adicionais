import { useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "./StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReclassificacaoDialogProps {
  solicitacao: any;
  userId: string;
  isAdmin?: boolean;
  onClose: () => void;
}

type SetorKey = "COMEX" | "ARMAZEM";
type NovaDecisao = "aprovado" | "recusado";

const ReclassificacaoDialog = ({ solicitacao, userId, isAdmin = false, onClose }: ReclassificacaoDialogProps) => {
  const [selectedSetor, setSelectedSetor] = useState<SetorKey | "">("");
  const [novaDecisao, setNovaDecisao] = useState<NovaDecisao | "">("");
  const [justificativa, setJustificativa] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verifica status atual de cada setor
  const comexStatus = solicitacao.comex_aprovado;
  const armazemStatus = solicitacao.armazem_aprovado;

  const getStatusLabel = (status: boolean | null) => {
    if (status === null) return "Pendente";
    return status ? "Aprovado" : "Recusado";
  };

  // Determina qual será a nova decisão oposta
  const getNovaDecisaoOposta = (setor: SetorKey): NovaDecisao | null => {
    const currentStatus = setor === "COMEX" ? comexStatus : armazemStatus;
    if (currentStatus === null) return null;
    return currentStatus ? "recusado" : "aprovado";
  };

  const handleSetorChange = (setor: SetorKey) => {
    setSelectedSetor(setor);
    const novaDecisaoAuto = getNovaDecisaoOposta(setor);
    if (novaDecisaoAuto) {
      setNovaDecisao(novaDecisaoAuto);
    }
  };

  const handleSubmit = () => {
    if (!selectedSetor) {
      toast.error("Selecione o setor para reclassificar.");
      return;
    }
    if (!novaDecisao) {
      toast.error("Selecione a nova decisão.");
      return;
    }
    if (!justificativa.trim() || justificativa.trim().length < 10) {
      toast.error("Justificativa obrigatória (mínimo 10 caracteres).");
      return;
    }
    setShowConfirm(true);
  };

  const confirmReclassificacao = async () => {
    setShowConfirm(false);
    setLoading(true);

    const updateData: any = {};
    const isAprovado = novaDecisao === "aprovado";

    if (selectedSetor === "COMEX") {
      updateData.comex_aprovado = isAprovado;
      updateData.comex_usuario_id = userId;
      updateData.comex_data = new Date().toISOString();
      updateData.comex_justificativa = justificativa;
    } else {
      updateData.armazem_aprovado = isAprovado;
      updateData.armazem_usuario_id = userId;
      updateData.armazem_data = new Date().toISOString();
      updateData.armazem_justificativa = justificativa;
    }

    const { error } = await supabase
      .from("solicitacoes")
      .update(updateData)
      .eq("id", solicitacao.id);

    if (error) {
      toast.error("Erro ao reclassificar: " + error.message);
      setLoading(false);
      return;
    }

    // Registrar no audit_log
    const setorLabel = selectedSetor === "COMEX" ? "Administrativo" : "Operacional";
    const detalhes = `Reclassificação de aprovação - Setor ${setorLabel}: ${getStatusLabel(selectedSetor === "COMEX" ? comexStatus : armazemStatus)} → ${novaDecisao === "aprovado" ? "Aprovado" : "Recusado"}. Justificativa: ${justificativa}`;

    await supabase.from("audit_log").insert({
      solicitacao_id: solicitacao.id,
      usuario_id: userId,
      acao: "reclassificação de aprovação",
      detalhes,
    });

    // Notificar usuários
    const { data: profiles } = await supabase.from("profiles").select("id");
    if (profiles) {
      const notifications = profiles.map((p) => ({
        usuario_id: p.id,
        solicitacao_id: solicitacao.id,
        mensagem: `Reclassificação: ${solicitacao.protocolo} - Setor ${setorLabel} alterado para ${novaDecisao === "aprovado" ? "Aprovado" : "Recusado"}`,
        tipo: "reclassificacao",
      }));
      await supabase.from("notifications").insert(notifications);
    }

    toast.success("Reclassificação registrada com sucesso!");
    setLoading(false);
    onClose();
  };

  const setoresDisponiveis: { key: SetorKey; label: string; status: boolean | null }[] = [
    { key: "COMEX", label: "Administrativo", status: comexStatus },
    { key: "ARMAZEM", label: "Operacional", status: armazemStatus },
  ];

  // Filtrar setores que já têm decisão (podem ser reclassificados)
  const setoresComDecisao = setoresDisponiveis.filter(s => s.status !== null);

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5" />
              Reclassificar Aprovação — {solicitacao.protocolo}
            </DialogTitle>
            <DialogDescription>
              Altere a decisão de um setor com justificativa obrigatória
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Atual */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-semibold mb-2">Status Atual</p>
              <div className="flex items-center gap-3">
                <StatusBadge status={solicitacao.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Administrativo:</span>{" "}
                  <span className={comexStatus === true ? "text-green-600" : comexStatus === false ? "text-destructive" : ""}>
                    {getStatusLabel(comexStatus)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Operacional:</span>{" "}
                  <span className={armazemStatus === true ? "text-green-600" : armazemStatus === false ? "text-destructive" : ""}>
                    {getStatusLabel(armazemStatus)}
                  </span>
                </div>
              </div>
            </div>

            {setoresComDecisao.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum setor com decisão para reclassificar.
              </p>
            ) : (
              <>
                {/* Seleção de Setor */}
                <div>
                  <Label>Setor a Reclassificar</Label>
                  <Select value={selectedSetor} onValueChange={(v) => handleSetorChange(v as SetorKey)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {setoresComDecisao.map((setor) => (
                        <SelectItem key={setor.key} value={setor.key}>
                          {setor.label} ({getStatusLabel(setor.status)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nova Decisão */}
                {selectedSetor && (
                  <div>
                    <Label>Nova Decisão</Label>
                    <Select value={novaDecisao} onValueChange={(v) => setNovaDecisao(v as NovaDecisao)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione a nova decisão" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aprovado">Aprovar</SelectItem>
                        <SelectItem value="recusado">Recusar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Justificativa */}
                <div>
                  <Label>Justificativa (obrigatória)</Label>
                  <Textarea
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    placeholder="Informe o motivo da reclassificação..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mínimo 10 caracteres. Será registrada no histórico.
                  </p>
                </div>

                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || !selectedSetor || !novaDecisao || justificativa.length < 10} 
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reclassificar
                </Button>
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

      {/* Confirmação */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Confirmar Reclassificação
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a reclassificar o setor <strong>{selectedSetor === "COMEX" ? "Administrativo" : "Operacional"}</strong> de{" "}
                <strong>{getStatusLabel(selectedSetor === "COMEX" ? comexStatus : armazemStatus)}</strong> para{" "}
                <strong>{novaDecisao === "aprovado" ? "Aprovado" : "Recusado"}</strong>.
              </p>
              <div className="bg-muted p-3 rounded text-sm">
                <strong>Justificativa:</strong> {justificativa}
              </div>
              <p className="font-medium">
                Esta ação será registrada no histórico. Deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReclassificacao}>
              Confirmar Reclassificação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReclassificacaoDialog;

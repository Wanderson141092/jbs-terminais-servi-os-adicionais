import { useState, useEffect } from "react";
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
  userSetor?: string | null; // Setor do usuário
  isAdmin?: boolean;
  onClose: () => void;
}

type SetorKey = "COMEX" | "ARMAZEM";
type NovaDecisao = "aprovado" | "recusado";

const ReclassificacaoDialog = ({ solicitacao, userId, userSetor, isAdmin = false, onClose }: ReclassificacaoDialogProps) => {
  const [selectedSetor, setSelectedSetor] = useState<SetorKey | "">("");
  const [justificativa, setJustificativa] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setorServicos, setSetorServicos] = useState<Set<string>>(new Set());

  // Verifica status atual de cada setor
  const comexStatus = solicitacao.comex_aprovado;
  const armazemStatus = solicitacao.armazem_aprovado;

  // Buscar permissões do setor do usuário
  useEffect(() => {
    const fetchSetorPermissions = async () => {
      if (!userSetor || isAdmin) return;

      // Buscar o setor_email pelo setor do usuário
      const { data: setorData } = await supabase
        .from("setor_emails")
        .select("id, setor")
        .eq("ativo", true);

      if (!setorData) return;

      // Verificar quais perfis o setor tem
      const matchingSetores = setorData.filter(s => {
        const setorLabel = s.setor;
        // Mapear setor do usuário para perfis permitidos
        if (userSetor === "COMEX" || userSetor === "ADMINISTRATIVO") {
          return setorLabel === "COMEX" || setorLabel === "ADMINISTRATIVO";
        }
        if (userSetor === "ARMAZEM" || userSetor === "OPERACIONAL") {
          return setorLabel === "ARMAZEM" || setorLabel === "OPERACIONAL";
        }
        if (userSetor === "MASTER") {
          return true; // Master tem acesso a tudo
        }
        return false;
      });

      const perfilSet = new Set<string>();
      matchingSetores.forEach(s => {
        if (s.setor === "COMEX" || s.setor === "ADMINISTRATIVO") {
          perfilSet.add("COMEX");
        }
        if (s.setor === "ARMAZEM" || s.setor === "OPERACIONAL") {
          perfilSet.add("ARMAZEM");
        }
      });

      // Se é MASTER, tem acesso a ambos
      if (userSetor === "MASTER") {
        perfilSet.add("COMEX");
        perfilSet.add("ARMAZEM");
      }

      setSetorServicos(perfilSet);
    };

    fetchSetorPermissions();
  }, [userSetor, isAdmin]);

  const getStatusLabel = (status: boolean | null) => {
    if (status === null) return "Pendente";
    return status ? "Aprovado" : "Recusado";
  };

  // Determina qual será a nova decisão oposta (automático)
  const getNovaDecisaoOposta = (setor: SetorKey): NovaDecisao | null => {
    const currentStatus = setor === "COMEX" ? comexStatus : armazemStatus;
    if (currentStatus === null) return null;
    return currentStatus ? "recusado" : "aprovado";
  };

  const handleSetorChange = (setor: SetorKey) => {
    setSelectedSetor(setor);
  };

  // Sempre usa a decisão oposta
  const novaDecisao = selectedSetor ? getNovaDecisaoOposta(selectedSetor) : null;

  const handleSubmit = () => {
    if (!selectedSetor) {
      toast.error("Selecione o setor para reclassificar.");
      return;
    }
    if (!novaDecisao) {
      toast.error("Não é possível reclassificar um setor pendente.");
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

  // Setores disponíveis para reclassificação
  const setoresDisponiveis: { key: SetorKey; label: string; status: boolean | null }[] = [
    { key: "COMEX", label: "Administrativa", status: comexStatus },
    { key: "ARMAZEM", label: "Operacional", status: armazemStatus },
  ];

  // Filtrar setores: 
  // 1. Devem ter decisão (não pendente)
  // 2. Usuário deve ter permissão (se não for admin)
  const setoresComDecisao = setoresDisponiveis.filter(s => {
    if (s.status === null) return false; // Só pode reclassificar se já tem decisão
    if (isAdmin) return true; // Admin pode tudo
    // Usuário corporativo só pode reclassificar setores que seu perfil permite
    return setorServicos.has(s.key);
  });

  // Se usuário não tem permissão para nenhum setor
  const semPermissao = !isAdmin && setoresComDecisao.length === 0 && 
    (comexStatus !== null || armazemStatus !== null);

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
                  <span className="text-muted-foreground">Administrativa:</span>{" "}
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

            {semPermissao ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Você não tem permissão para reclassificar este processo. 
                Seu setor não possui acesso aos setores com decisão.
              </p>
            ) : setoresComDecisao.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum setor com decisão para reclassificar.
              </p>
            ) : (
              <>
                {/* Seleção de Setor */}
                <div>
                  <Label>Tipo de Aprovação a Reclassificar</Label>
                  <Select value={selectedSetor} onValueChange={(v) => handleSetorChange(v as SetorKey)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o tipo" />
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

                {/* Nova Decisão - Automática (oposta da atual) */}
                {selectedSetor && novaDecisao && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <Label className="text-sm">Nova Decisão</Label>
                    <p className="text-lg font-semibold mt-1">
                    {novaDecisao === "aprovado" ? (
                        <span className="text-secondary">Aprovado</span>
                      ) : (
                        <span className="text-destructive">Recusado</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      A nova decisão é automaticamente o oposto da atual
                    </p>
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
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Reclassificação
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a reclassificar a aprovação <strong>{selectedSetor === "COMEX" ? "Administrativa" : "Operacional"}</strong> de{" "}
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

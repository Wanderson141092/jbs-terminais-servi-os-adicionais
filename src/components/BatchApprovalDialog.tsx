import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BatchApprovalDialogProps {
  solicitacoes: any[];
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const BatchApprovalDialog = ({
  solicitacoes,
  userId,
  onClose,
  onSuccess,
}: BatchApprovalDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [observacao, setObservacao] = useState("");

  const handleBatchApprove = async () => {
    setLoading(true);
    
    try {
      // Update all selected solicitacoes
      for (const sol of solicitacoes) {
        const { error } = await supabase
          .from("solicitacoes")
          .update({
            armazem_aprovado: true,
            armazem_usuario_id: userId,
            armazem_data: new Date().toISOString(),
            armazem_justificativa: observacao || null,
          })
          .eq("id", sol.id);

        if (error) {
          console.error("Error approving:", sol.protocolo, error);
          continue;
        }

        // Log audit
        await supabase.from("audit_log").insert({
          solicitacao_id: sol.id,
          usuario_id: userId,
          acao: "aprovacao_lote",
          detalhes: `Aprovação Operacional em lote${observacao ? `: ${observacao}` : ""}`,
        });

        // Record for integration queue
        await supabase.from("integration_history").insert({
          solicitacao_id: sol.id,
          integracao_nome: "batch_approval",
          tipo: "aprovacao_lote",
          status: "pendente",
          payload: { protocolo: sol.protocolo, aprovado: true },
        });
      }

      toast.success(`${solicitacoes.length} processos aprovados com sucesso!`);
      onSuccess();
    } catch (err) {
      toast.error("Erro ao processar aprovações em lote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-secondary" />
            Aprovação em Lote (Operacional)
          </DialogTitle>
          <DialogDescription>
            Aprovar {solicitacoes.length} processo(s) selecionado(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium mb-2">Processos selecionados:</p>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-auto">
              {solicitacoes.map((s) => (
                <span
                  key={s.id}
                  className="bg-primary/10 text-primary text-xs px-2 py-1 rounded font-mono"
                >
                  {s.protocolo}
                </span>
              ))}
            </div>
          </div>

          <div>
            <Label>Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione uma observação para todas as aprovações..."
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleBatchApprove}
            disabled={loading}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {loading ? "Processando..." : "Confirmar Aprovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchApprovalDialog;

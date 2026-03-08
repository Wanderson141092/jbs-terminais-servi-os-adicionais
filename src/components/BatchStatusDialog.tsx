import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStatusProcesso } from "@/hooks/useStatusProcesso";

interface BatchStatusDialogProps {
  solicitacoes: any[];
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const BatchStatusDialog = ({
  solicitacoes,
  userId,
  onClose,
  onSuccess,
}: BatchStatusDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const { statusOptions, getStatusLabel } = useStatusProcesso();

  const handleBatchUpdate = async () => {
    if (!selectedStatus) {
      toast.error("Selecione um status");
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      for (const sol of solicitacoes) {
        // Use edge function — single source of truth for status transitions
        const { data, error } = await supabase.functions.invoke("request_process_transition", {
          body: {
            solicitacao_id: sol.id,
            current_status: sol.status,
            target_status: selectedStatus,
            force_correction: true,
          },
        });

        if (error || data?.ok === false) {
          console.error("Error updating:", sol.protocolo, data?.error?.message || error?.message);
          continue;
        }

        // Log audit via secure RPC
        const statusLabel = getStatusLabel(selectedStatus);
        await supabase.rpc("insert_audit_log", {
          p_solicitacao_id: sol.id,
          p_usuario_id: userId,
          p_acao: "atualizacao_status_lote",
          p_detalhes: `Status atualizado em lote para: ${statusLabel}. Status anterior: ${sol.status_vistoria || sol.status}. Protocolo: ${sol.protocolo}. Total no lote: ${solicitacoes.length} processos.`,
        });
        successCount++;
      }

      toast.success(`${successCount} de ${solicitacoes.length} processos atualizados com sucesso!`);
      onSuccess();
    } catch (err) {
      toast.error("Erro ao processar atualizações em lote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Atualizar Status em Lote
          </DialogTitle>
          <DialogDescription>
            Atualizar {solicitacoes.length} processo(s) selecionado(s)
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
            <Label>Novo Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleBatchUpdate} disabled={loading || !selectedStatus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {loading ? "Processando..." : "Confirmar Atualização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchStatusDialog;

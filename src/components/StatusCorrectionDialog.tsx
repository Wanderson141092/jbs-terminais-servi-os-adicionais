import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";

interface StatusCorrectionDialogProps {
  solicitacao: any;
  userId: string;
  onClose: () => void;
}

const StatusCorrectionDialog = ({ solicitacao, userId, onClose }: StatusCorrectionDialogProps) => {
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatuses = async () => {
      const { data } = await supabase
        .from("parametros_campos")
        .select("valor, sigla, ordem, tipo_resultado")
        .eq("grupo", "status_processo")
        .eq("ativo", true)
        .order("ordem");

      if (data) {
        const seen = new Set<string>();
        const opts = data
          .map((s: any) => ({
            value: s.sigla || s.valor.toLowerCase().replace(/ /g, "_").replace(/-/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            label: s.valor,
            ordem: s.ordem,
            tipo_resultado: s.tipo_resultado,
          }))
          .filter((o: any) => {
            if (seen.has(o.value)) return false;
            seen.add(o.value);
            return o.value !== solicitacao.status;
          });
        setStatusOptions(opts);
      }
    };
    fetchStatuses();
  }, [solicitacao.status]);

  const handleSave = async () => {
    if (!selectedStatus) {
      toast.error("Selecione um status.");
      return;
    }
    if (!justificativa.trim()) {
      toast.error("Informe a justificativa da correção.");
      return;
    }

    setLoading(true);

    const statusLabel = statusOptions.find(s => s.value === selectedStatus)?.label || selectedStatus;

    // Use edge function for status correction — single source of truth
    const { data, error } = await supabase.functions.invoke("request_process_transition", {
      body: {
        solicitacao_id: solicitacao.id,
        current_status: solicitacao.status,
        target_status: selectedStatus,
        justification: `[Correção de Status] Status: ${statusLabel}.\nObservação: ${justificativa.trim()}.`,
        force_correction: true,
      },
    });

    if (error || data?.ok === false) {
      const msg = data?.error?.message || error?.message || "Erro desconhecido";
      toast.error("Erro ao corrigir status: " + msg);
      setLoading(false);
      return;
    }

    // Log audit
    await supabase.rpc("insert_audit_log", {
      p_solicitacao_id: solicitacao.id,
      p_usuario_id: userId,
      p_acao: "correcao_status",
      p_detalhes: `Correção de status: ${solicitacao.status} → ${statusLabel}. Justificativa: ${justificativa.trim()}`,
    });

    toast.success("Status corrigido com sucesso!");
    setLoading(false);
    onClose();
  };

  const iconColorMap: Record<string, string> = {
    conforme: "text-emerald-600",
    nao_conforme: "text-red-600",
    em_pendencia: "text-amber-600",
    neutro: "text-blue-600",
  };

  const iconMap: Record<string, React.ReactNode> = {
    conforme: <CheckCircle2 className="h-3.5 w-3.5" />,
    nao_conforme: <XCircle className="h-3.5 w-3.5" />,
    em_pendencia: <AlertTriangle className="h-3.5 w-3.5" />,
    neutro: <Clock className="h-3.5 w-3.5" />,
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Corrigir Status</DialogTitle>
          <DialogDescription>
            Protocolo: <strong>{solicitacao.protocolo}</strong> · Status atual: <strong>{solicitacao.status_vistoria || solicitacao.status}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Selecione o status correto:</Label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-auto border rounded-md p-3">
              {statusOptions.map((opt) => {
                const tipo = opt.tipo_resultado || "neutro";
                const isSelected = selectedStatus === opt.value;
                return (
                  <Button
                    key={opt.value}
                    variant={isSelected ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus(opt.value)}
                    className={`flex items-center gap-1.5 [&_svg]:!text-current ${isSelected ? "ring-2 ring-ring font-semibold" : ""}`}
                  >
                    <span className={iconColorMap[tipo]}>{iconMap[tipo]}</span>
                    <span>{opt.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Justificativa da correção *</Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique o motivo da correção de status..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !selectedStatus || !justificativa.trim()}>
            {loading ? "Salvando..." : "Confirmar Correção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusCorrectionDialog;

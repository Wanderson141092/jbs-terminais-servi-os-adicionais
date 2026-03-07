import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Check, Undo2 } from "lucide-react";

interface BillingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao: any;
  cobrancaConfig: any;
  userId: string;
  onUpdate: () => void;
}

const BillingConfirmDialog = ({ open, onOpenChange, solicitacao, cobrancaConfig, onUpdate }: BillingConfirmDialogProps) => {
  const [registro, setRegistro] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && solicitacao && cobrancaConfig) {
      fetchRegistro();
    }
  }, [open, solicitacao?.id, cobrancaConfig?.id]);

  const fetchRegistro = async () => {
    const { data } = await supabase
      .from("lancamento_cobranca_registros")
      .select("*")
      .eq("solicitacao_id", solicitacao.id)
      .eq("cobranca_config_id", cobrancaConfig.id)
      .maybeSingle();
    setRegistro(data);
  };

  const isConfirmed = registro?.confirmado === true;

  const getStructuredError = (fallback: string, payload: any) => {
    if (payload?.error?.message) return payload.error.message as string;
    if (payload?.message) return payload.message as string;
    return fallback;
  };

  const handleConfirmar = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("confirm_billing", {
      body: {
        solicitacao_id: solicitacao.id,
        cobranca_config_id: cobrancaConfig.id,
        confirm: true,
      },
    });

    if (error || data?.ok === false) {
      toast.error(getStructuredError("Erro ao confirmar lançamento.", data) + (error?.message ? ` ${error.message}` : ""));
      setLoading(false);
      return;
    }

    await fetchRegistro();
    toast.success(`Lançamento "${cobrancaConfig.rotulo_analise}" confirmado!`);
    setLoading(false);
    onOpenChange(false);
    onUpdate();
  };

  const handleDesfazer = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("confirm_billing", {
      body: {
        solicitacao_id: solicitacao.id,
        cobranca_config_id: cobrancaConfig.id,
        confirm: false,
      },
    });

    if (error || data?.ok === false) {
      toast.error(getStructuredError("Erro ao desfazer lançamento.", data) + (error?.message ? ` ${error.message}` : ""));
      setLoading(false);
      return;
    }

    await fetchRegistro();
    toast.success(`Lançamento "${cobrancaConfig.rotulo_analise}" desfeito!`);
    setLoading(false);
    onOpenChange(false);
    onUpdate();
  };

  if (!solicitacao || !cobrancaConfig) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {cobrancaConfig.rotulo_analise}
          </DialogTitle>
          <DialogDescription>
            Confirme ou desfaça o lançamento da cobrança no sistema financeiro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p><strong>Protocolo:</strong> {solicitacao.protocolo}</p>
            <p><strong>Tipo:</strong> {cobrancaConfig.tipo === "servico" ? "Serviço Adicional" : "Pendência"}</p>
            <p>
              <strong>Status:</strong>{" "}
              <Badge variant={isConfirmed ? "default" : "destructive"} className="text-xs">
                {isConfirmed ? "Confirmado" : "Aguardando confirmação"}
              </Badge>
            </p>
            {isConfirmed && registro?.confirmado_data && (
              <p className="text-xs text-muted-foreground">
                Confirmado em {new Date(registro.confirmado_data).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {isConfirmed ? (
            <Button
              variant="destructive"
              onClick={handleDesfazer}
              disabled={loading}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              {loading ? "Processando..." : "Desfazer Lançamento"}
            </Button>
          ) : (
            <Button
              onClick={handleConfirmar}
              disabled={loading}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Check className="h-4 w-4 mr-2" />
              {loading ? "Processando..." : "Confirmar Lançamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BillingConfirmDialog;

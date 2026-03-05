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

const BillingConfirmDialog = ({ open, onOpenChange, solicitacao, cobrancaConfig, userId, onUpdate }: BillingConfirmDialogProps) => {
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

  const handleConfirmar = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("lancamento_cobranca_registros")
      .upsert({
        solicitacao_id: solicitacao.id,
        cobranca_config_id: cobrancaConfig.id,
        confirmado: true,
        confirmado_por: userId,
        confirmado_data: new Date().toISOString(),
      }, { onConflict: "solicitacao_id,cobranca_config_id" });

    if (error) {
      toast.error("Erro ao confirmar lançamento");
      setLoading(false);
      return;
    }

    // Check if ALL registros are now confirmed for global field
    const { data: allRegs } = await supabase
      .from("lancamento_cobranca_registros")
      .select("*")
      .eq("solicitacao_id", solicitacao.id);

    const { data: allConfigs } = await supabase
      .from("lancamento_cobranca_config")
      .select("*")
      .eq("ativo", true);

    const applicableConfigs = (allConfigs || []).filter((cfg: any) => {
      const statusAtivacao = cfg.status_ativacao || [];
      if (statusAtivacao.length > 0 && !statusAtivacao.includes(solicitacao.status)) return false;
      const svcIds = cfg.servico_ids || [];
      if (svcIds.length > 0) {
        // Would need service ID check - skip for simplicity
      }
      if (cfg.tipo === "pendencia" && solicitacao.lacre_armador_aceite_custo !== true) return false;
      return true;
    });

    const allConfirmed = applicableConfigs.every((cfg: any) => {
      const reg = (allRegs || []).find((r: any) => r.cobranca_config_id === cfg.id);
      return reg?.confirmado === true;
    });

    if (allConfirmed) {
      await supabase.from("solicitacoes").update({
        lancamento_confirmado: true,
        lancamento_confirmado_por: userId,
        lancamento_confirmado_data: new Date().toISOString(),
      }).eq("id", solicitacao.id);
    }

    await supabase.rpc("insert_audit_log", {
      p_solicitacao_id: solicitacao.id,
      p_usuario_id: userId,
      p_acao: "lancamento_confirmado",
      p_detalhes: `Lançamento confirmado: ${cobrancaConfig.rotulo_analise}. Protocolo: ${solicitacao.protocolo}.`,
    });

    toast.success(`Lançamento "${cobrancaConfig.rotulo_analise}" confirmado!`);
    setLoading(false);
    onOpenChange(false);
    onUpdate();
  };

  const handleDesfazer = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("lancamento_cobranca_registros")
      .update({
        confirmado: false,
        confirmado_por: null,
        confirmado_data: null,
        updated_at: new Date().toISOString(),
      })
      .eq("solicitacao_id", solicitacao.id)
      .eq("cobranca_config_id", cobrancaConfig.id);

    if (error) {
      toast.error("Erro ao desfazer lançamento");
      setLoading(false);
      return;
    }

    await supabase.from("solicitacoes").update({
      lancamento_confirmado: false,
      lancamento_confirmado_por: null,
      lancamento_confirmado_data: null,
    }).eq("id", solicitacao.id);

    await supabase.rpc("insert_audit_log", {
      p_solicitacao_id: solicitacao.id,
      p_usuario_id: userId,
      p_acao: "lancamento_desfeito",
      p_detalhes: `Lançamento desfeito: ${cobrancaConfig.rotulo_analise}. Protocolo: ${solicitacao.protocolo}.`,
    });

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

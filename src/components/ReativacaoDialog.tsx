import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReativacaoDialogProps {
  solicitacao: { id: string; protocolo: string; tipo_operacao?: string | null };
  userId: string;
  onClose: () => void;
}

const ReativacaoDialog = ({ solicitacao, userId, onClose }: ReativacaoDialogProps) => {
  const [justificativa, setJustificativa] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReativar = async () => {
    if (!justificativa.trim()) {
      toast.error("A justificativa é obrigatória para reativar a solicitação.");
      return;
    }

    setSaving(true);
    try {
      // Determine target status based on service type
      const isPosicionamento = solicitacao.tipo_operacao?.toLowerCase().includes("posicionamento");
      const targetStatus = isPosicionamento ? "aguardando_confirmacao" : "confirmado_aguardando_servico";

      // Update status
      const { error: updateError } = await supabase
        .from("solicitacoes")
        .update({ status: targetStatus as any })
        .eq("id", solicitacao.id);

      if (updateError) throw updateError;

      // Log audit
      await supabase.rpc("insert_audit_log", {
        p_solicitacao_id: solicitacao.id,
        p_usuario_id: userId,
        p_acao: "reativacao",
        p_detalhes: `Solicitação reativada. Justificativa: ${justificativa.trim()}`,
      });

      // Add observation
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", userId)
        .maybeSingle();

      await supabase.from("observacao_historico").insert({
        solicitacao_id: solicitacao.id,
        autor_id: userId,
        autor_nome: profileData?.nome || "Usuário interno",
        observacao: `[REATIVAÇÃO] ${justificativa.trim()}`,
        status_no_momento: targetStatus,
      });

      toast.success("Solicitação reativada com sucesso!");
      onClose();
    } catch (err: any) {
      toast.error("Erro ao reativar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reativar Solicitação {solicitacao.protocolo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Esta solicitação foi recusada automaticamente por ter sido realizada após o horário de corte. 
            Informe a justificativa para reativá-la.
          </p>
          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa da reativação *</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Informe o motivo da reativação..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleReativar} disabled={saving || !justificativa.trim()}>
            {saving ? "Reativando..." : "Reativar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReativacaoDialog;

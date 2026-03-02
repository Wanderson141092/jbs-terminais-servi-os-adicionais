import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Loader2, Check } from "lucide-react";

interface BatchBillingDialogProps {
  solicitacoes: any[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BatchBillingDialog = ({ solicitacoes, open, onClose, onSuccess }: BatchBillingDialogProps) => {
  const [cobrancaConfigs, setCobrancaConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  
  useEffect(() => {
    if (open) {
      loadConfigs();
    }
  }, [open]);

  const loadConfigs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lancamento_cobranca_config")
      .select("*")
      .eq("ativo", true)
      .order("created_at");
    setCobrancaConfigs(data || []);
    setLoading(false);
  };

  const toggleConfig = (id: string) => {
    setSelectedConfigIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (selectedConfigIds.length === 0) {
      toast.error("Selecione pelo menos um tipo de cobrança para lançar.");
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let successCount = 0;
      
      for (const sol of solicitacoes) {
        const configsToApply = cobrancaConfigs.filter(cfg => {
          if (!selectedConfigIds.includes(cfg.id)) return false;
          
          // Check service match
          if (cfg.servico_ids?.length > 0) {
            const servicoMatch = sol.servico_id ? cfg.servico_ids.includes(sol.servico_id) : false;
            if (!servicoMatch) return false;
          }
          
          // Check status activation
          if (cfg.status_ativacao?.length > 0 && !cfg.status_ativacao.includes(sol.status)) {
            return false;
          }

          // Pendencia logic check
          if (cfg.tipo === "pendencia" && sol.lacre_armador_aceite_custo !== true) {
            return false;
          }

          return true;
        });
        
        for (const cfg of configsToApply) {
          await supabase.from("lancamento_cobranca_registros").upsert({
            solicitacao_id: sol.id,
            cobranca_config_id: cfg.id,
            confirmado: true,
            confirmado_por: user.id,
            confirmado_data: new Date().toISOString(),
          }, { onConflict: "solicitacao_id,cobranca_config_id" });
        }
        successCount++;
      }

      toast.success(`${successCount} processos processados com sucesso!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao processar lançamentos: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !processing && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Lançamento em Lote
          </DialogTitle>
          <DialogDescription>
            Selecione as cobranças para confirmar em <strong>{solicitacoes.length}</strong> processos selecionados.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="border rounded-md divide-y">
              {cobrancaConfigs.map(cfg => (
                <div key={cfg.id} className="flex items-center p-3 hover:bg-muted/50 transition-colors">
                  <Checkbox 
                    id={`batch-${cfg.id}`}
                    checked={selectedConfigIds.includes(cfg.id)}
                    onCheckedChange={() => toggleConfig(cfg.id)}
                  />
                  <label htmlFor={`batch-${cfg.id}`} className="ml-3 flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{cfg.rotulo_analise}</span>
                      <Badge variant="outline" className="text-[10px]">{cfg.tipo === 'servico' ? 'Serviço' : 'Pendência'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cfg.nome}
                    </p>
                  </label>
                </div>
              ))}
              {cobrancaConfigs.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma configuração de cobrança ativa.
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground bg-yellow-50 text-yellow-700 p-2 rounded">
              Nota: As cobranças só serão aplicadas se o processo atender aos critérios de status e tipo de serviço configurados.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={processing || selectedConfigIds.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirmar Lançamentos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchBillingDialog;

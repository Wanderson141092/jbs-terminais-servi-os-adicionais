import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, FileText, Lock } from "lucide-react";

interface Servico {
  id: string;
  nome: string;
  deferimento_status_ativacao: string[] | null;
  lacre_armador_status_ativacao: string[] | null;
}

interface StatusOption {
  value: string;
  label: string;
}

const ToggleActivationManager = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Deferimento config
  const [defServicoIds, setDefServicoIds] = useState<string[]>([]);
  const [defStatusList, setDefStatusList] = useState<string[]>([]);

  // Lacre Armador config
  const [lacreServicoIds, setLacreServicoIds] = useState<string[]>([]);
  const [lacreStatusList, setLacreStatusList] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    const [servicosRes, statusRes] = await Promise.all([
      supabase.from("servicos").select("id, nome, deferimento_status_ativacao, lacre_armador_status_ativacao").eq("ativo", true).order("nome"),
      supabase.from("parametros_campos").select("valor, sigla").eq("grupo", "status_processo").eq("ativo", true).order("ordem"),
    ]);

    const svcList = (servicosRes.data || []) as Servico[];
    setServicos(svcList);

    const opts = (statusRes.data || []).map((s: any) => ({
      value: s.sigla || s.valor.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      label: s.valor,
    }));
    setStatusOptions(opts);

    // Derive current config from services
    const defIds: string[] = [];
    let defStatuses: string[] = [];
    const lacreIds: string[] = [];
    let lacreStatuses: string[] = [];

    svcList.forEach(s => {
      if (s.deferimento_status_ativacao && s.deferimento_status_ativacao.length > 0) {
        defIds.push(s.id);
        if (defStatuses.length === 0) defStatuses = [...s.deferimento_status_ativacao];
      }
      if (s.lacre_armador_status_ativacao && s.lacre_armador_status_ativacao.length > 0) {
        lacreIds.push(s.id);
        if (lacreStatuses.length === 0) lacreStatuses = [...s.lacre_armador_status_ativacao];
      }
    });

    setDefServicoIds(defIds);
    setDefStatusList(defStatuses);
    setLacreServicoIds(lacreIds);
    setLacreStatusList(lacreStatuses);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleSave = async () => {
    setSaving(true);

    // Update all services: set activation arrays for selected, clear for unselected
    const updates = servicos.map(s => {
      const defStatus = defServicoIds.includes(s.id) ? defStatusList : [];
      const lacreStatus = lacreServicoIds.includes(s.id) ? lacreStatusList : [];
      return supabase.from("servicos").update({
        deferimento_status_ativacao: defStatus,
        lacre_armador_status_ativacao: lacreStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", s.id);
    });

    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);

    if (hasError) {
      toast.error("Erro ao salvar configuração");
    } else {
      toast.success("Configuração de toggles salva!");
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Ativação de Toggles (Deferimento / Lacre Armador)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Configure em quais serviços e a partir de quais status os botões de <strong>Deferimento</strong> e <strong>Lacre Armador</strong> ficam visíveis na análise interna.
        </p>

        {/* Deferimento */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Deferimento</h3>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase">Serviços</Label>
            <div className="flex flex-wrap gap-2 mt-1 border rounded-lg p-3 max-h-40 overflow-auto">
              {servicos.map(s => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`def-svc-${s.id}`}
                    checked={defServicoIds.includes(s.id)}
                    onCheckedChange={() => toggleItem(defServicoIds, setDefServicoIds, s.id)}
                  />
                  <label htmlFor={`def-svc-${s.id}`} className="text-sm cursor-pointer">{s.nome}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase">Status que habilitam o toggle</Label>
            <div className="flex flex-wrap gap-2 mt-1 border rounded-lg p-3 max-h-40 overflow-auto">
              {statusOptions.map(st => (
                <div key={st.value} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`def-st-${st.value}`}
                    checked={defStatusList.includes(st.value)}
                    onCheckedChange={() => toggleItem(defStatusList, setDefStatusList, st.value)}
                  />
                  <label htmlFor={`def-st-${st.value}`} className="text-sm cursor-pointer">{st.label}</label>
                </div>
              ))}
            </div>
            {defStatusList.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {defStatusList.map(v => {
                  const lbl = statusOptions.find(o => o.value === v)?.label || v;
                  return <Badge key={v} variant="secondary" className="text-[10px]">{lbl}</Badge>;
                })}
              </div>
            )}
          </div>
        </div>

        {/* Lacre Armador */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Lacre Armador</h3>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase">Serviços</Label>
            <div className="flex flex-wrap gap-2 mt-1 border rounded-lg p-3 max-h-40 overflow-auto">
              {servicos.map(s => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`lacre-svc-${s.id}`}
                    checked={lacreServicoIds.includes(s.id)}
                    onCheckedChange={() => toggleItem(lacreServicoIds, setLacreServicoIds, s.id)}
                  />
                  <label htmlFor={`lacre-svc-${s.id}`} className="text-sm cursor-pointer">{s.nome}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase">Status que habilitam o toggle</Label>
            <div className="flex flex-wrap gap-2 mt-1 border rounded-lg p-3 max-h-40 overflow-auto">
              {statusOptions.map(st => (
                <div key={st.value} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`lacre-st-${st.value}`}
                    checked={lacreStatusList.includes(st.value)}
                    onCheckedChange={() => toggleItem(lacreStatusList, setLacreStatusList, st.value)}
                  />
                  <label htmlFor={`lacre-st-${st.value}`} className="text-sm cursor-pointer">{st.label}</label>
                </div>
              ))}
            </div>
            {lacreStatusList.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {lacreStatusList.map(v => {
                  const lbl = statusOptions.find(o => o.value === v)?.label || v;
                  return <Badge key={v} variant="secondary" className="text-[10px]">{lbl}</Badge>;
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ToggleActivationManager;

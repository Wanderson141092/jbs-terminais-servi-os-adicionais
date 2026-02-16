import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, FileText, Lock, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Servico {
  id: string;
  nome: string;
  deferimento_status_ativacao: string[] | null;
  lacre_armador_status_ativacao: string[] | null;
  deferimento_pendencias_ativacao: string[] | null;
  lacre_armador_pendencias_ativacao: string[] | null;
}

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}

const MultiSelect = ({ options, selected, onChange, placeholder }: MultiSelectProps) => {
  const [open, setOpen] = useState(false);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value]
    );
  };

  const removeItem = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(v => v !== value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between h-auto min-h-10 font-normal"
        >
          <div className="flex flex-wrap gap-1 flex-1 text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map(v => {
                const lbl = options.find(o => o.value === v)?.label || v;
                return (
                  <Badge key={v} variant="secondary" className="text-xs gap-1">
                    {lbl}
                    <X className="h-3 w-3 cursor-pointer" onClick={(e) => removeItem(v, e)} />
                  </Badge>
                );
              })
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map(opt => (
                <CommandItem key={opt.value} onSelect={() => toggle(opt.value)} className="cursor-pointer">
                  <Checkbox checked={selected.includes(opt.value)} className="mr-2" />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const ToggleActivationManager = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [statusOptions, setStatusOptions] = useState<Option[]>([]);
  const [pendenciaOptions, setPendenciaOptions] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);

  // Deferimento config
  const [defServicoIds, setDefServicoIds] = useState<string[]>([]);
  const [defStatusList, setDefStatusList] = useState<string[]>([]);
  const [defPendenciasList, setDefPendenciasList] = useState<string[]>([]);

  // Lacre Armador config
  const [lacreServicoIds, setLacreServicoIds] = useState<string[]>([]);
  const [lacreStatusList, setLacreStatusList] = useState<string[]>([]);
  const [lacrePendenciasList, setLacrePendenciasList] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    const [servicosRes, statusRes, pendenciasRes] = await Promise.all([
      supabase.from("servicos").select("id, nome, deferimento_status_ativacao, lacre_armador_status_ativacao, deferimento_pendencias_ativacao, lacre_armador_pendencias_ativacao").eq("ativo", true).order("nome"),
      supabase.from("parametros_campos").select("valor, sigla").eq("grupo", "status_processo").eq("ativo", true).order("ordem"),
      supabase.from("parametros_campos").select("valor, sigla").eq("grupo", "pendencia_opcoes").eq("ativo", true).order("ordem"),
    ]);

    const svcList = (servicosRes.data || []) as Servico[];
    setServicos(svcList);

    const opts = (statusRes.data || []).map((s: any) => ({
      value: s.sigla || s.valor.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      label: s.valor,
    }));
    setStatusOptions(opts);

    const pendOpts = (pendenciasRes.data || []).map((s: any) => ({
      value: s.valor,
      label: s.valor,
    }));
    setPendenciaOptions(pendOpts);

    // Derive current config from services
    const defIds: string[] = [];
    let defStatuses: string[] = [];
    let defPendencias: string[] = [];
    const lacreIds: string[] = [];
    let lacreStatuses: string[] = [];
    let lacrePendencias: string[] = [];

    svcList.forEach(s => {
      if (s.deferimento_status_ativacao && s.deferimento_status_ativacao.length > 0) {
        defIds.push(s.id);
        if (defStatuses.length === 0) defStatuses = [...s.deferimento_status_ativacao];
      }
      if (s.deferimento_pendencias_ativacao && s.deferimento_pendencias_ativacao.length > 0) {
        if (defPendencias.length === 0) defPendencias = [...s.deferimento_pendencias_ativacao];
      }
      if (s.lacre_armador_status_ativacao && s.lacre_armador_status_ativacao.length > 0) {
        lacreIds.push(s.id);
        if (lacreStatuses.length === 0) lacreStatuses = [...s.lacre_armador_status_ativacao];
      }
      if (s.lacre_armador_pendencias_ativacao && s.lacre_armador_pendencias_ativacao.length > 0) {
        if (lacrePendencias.length === 0) lacrePendencias = [...s.lacre_armador_pendencias_ativacao];
      }
    });

    setDefServicoIds(defIds);
    setDefStatusList(defStatuses);
    setDefPendenciasList(defPendencias);
    setLacreServicoIds(lacreIds);
    setLacreStatusList(lacreStatuses);
    setLacrePendenciasList(lacrePendencias);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const servicoOptions: Option[] = servicos.map(s => ({ value: s.id, label: s.nome }));

  const handleSave = async () => {
    setSaving(true);

    const updates = servicos.map(s => {
      const defStatus = defServicoIds.includes(s.id) ? defStatusList : [];
      const lacreStatus = lacreServicoIds.includes(s.id) ? lacreStatusList : [];
      const defPend = defServicoIds.includes(s.id) ? defPendenciasList : [];
      const lacrePend = lacreServicoIds.includes(s.id) ? lacrePendenciasList : [];
      return supabase.from("servicos").update({
        deferimento_status_ativacao: defStatus,
        lacre_armador_status_ativacao: lacreStatus,
        deferimento_pendencias_ativacao: defPend,
        lacre_armador_pendencias_ativacao: lacrePend,
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
          Configure em quais serviços, status e pendências os botões de <strong>Deferimento</strong> e <strong>Lacre Armador</strong> ficam visíveis na análise interna.
        </p>

        {/* Deferimento */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Deferimento</h3>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Serviços</Label>
            <MultiSelect
              options={servicoOptions}
              selected={defServicoIds}
              onChange={setDefServicoIds}
              placeholder="Selecione os serviços..."
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Status que habilitam o toggle</Label>
            <MultiSelect
              options={statusOptions}
              selected={defStatusList}
              onChange={setDefStatusList}
              placeholder="Selecione os status..."
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Pendências que ativam o deferimento</Label>
            <MultiSelect
              options={pendenciaOptions}
              selected={defPendenciasList}
              onChange={setDefPendenciasList}
              placeholder="Selecione as pendências..."
            />
          </div>
        </div>

        {/* Lacre Armador */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Lacre Armador</h3>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Serviços</Label>
            <MultiSelect
              options={servicoOptions}
              selected={lacreServicoIds}
              onChange={setLacreServicoIds}
              placeholder="Selecione os serviços..."
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Status que habilitam o toggle</Label>
            <MultiSelect
              options={statusOptions}
              selected={lacreStatusList}
              onChange={setLacreStatusList}
              placeholder="Selecione os status..."
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Pendências que ativam o lacre armador</Label>
            <MultiSelect
              options={pendenciaOptions}
              selected={lacrePendenciasList}
              onChange={setLacrePendenciasList}
              placeholder="Selecione as pendências..."
            />
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

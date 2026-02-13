import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StatusProcessoOption {
  id: string;
  valor: string;
  sigla: string;
  servico_ids: string[];
}

let cachedOptions: StatusProcessoOption[] | null = null;

export const useStatusProcesso = () => {
  const [statusOptions, setStatusOptions] = useState<StatusProcessoOption[]>(cachedOptions || []);
  const [loading, setLoading] = useState(!cachedOptions);

  useEffect(() => {
    if (cachedOptions) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("parametros_campos")
        .select("id, valor, sigla, servico_ids")
        .eq("grupo", "status_processo")
        .eq("ativo", true)
        .order("ordem");
      const mapped = (data || []).map((s: any) => ({
        id: s.id,
        valor: s.valor,
        sigla: s.sigla || s.valor.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        servico_ids: s.servico_ids || []
      }));
      cachedOptions = mapped;
      setStatusOptions(mapped);
      setLoading(false);
    };
    fetch();
  }, []);

  const getLabel = (sigla: string): string => {
    const found = statusOptions.find(s => s.sigla === sigla);
    return found?.valor || sigla;
  };

  const getFilteredByService = (servicoId?: string) => {
    return statusOptions.filter(s =>
      s.servico_ids.length === 0 || (servicoId && s.servico_ids.includes(servicoId))
    );
  };

  const asLabelMap = (): Record<string, string> => {
    const map: Record<string, string> = {};
    statusOptions.forEach(s => { map[s.sigla] = s.valor; });
    return map;
  };

  return { statusOptions, loading, getLabel, getFilteredByService, asLabelMap };
};

// For non-hook contexts (like static components)
export const fetchStatusProcessoOptions = async (): Promise<StatusProcessoOption[]> => {
  if (cachedOptions) return cachedOptions;
  const { data } = await supabase
    .from("parametros_campos")
    .select("id, valor, sigla, servico_ids")
    .eq("grupo", "status_processo")
    .eq("ativo", true)
    .order("ordem");
  const mapped = (data || []).map((s: any) => ({
    id: s.id,
    valor: s.valor,
    sigla: s.sigla || s.valor.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    servico_ids: s.servico_ids || []
  }));
  cachedOptions = mapped;
  return mapped;
};

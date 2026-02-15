import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StatusOption {
  value: string;
  label: string;
  tipo_resultado?: string | null;
}

let cachedOptions: StatusOption[] | null = null;
let cachePromise: Promise<StatusOption[]> | null = null;

const fetchStatusOptions = async (): Promise<StatusOption[]> => {
  const { data } = await supabase
    .from("parametros_campos")
    .select("valor, sigla, tipo_resultado")
    .eq("grupo", "status_processo")
    .eq("ativo", true)
    .order("ordem");

  const options = (data || []).map((s: any) => ({
    value: s.sigla || s.valor.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    label: s.valor,
    tipo_resultado: s.tipo_resultado || null,
  }));

  cachedOptions = options;
  return options;
};

/**
 * Hook that fetches status options from parametros_campos > status_processo.
 * Uses a shared cache so multiple components don't trigger redundant fetches.
 * 
 * Returns:
 * - statusOptions: array of { value, label }
 * - statusLabels: Record<string, string> mapping value -> label (compatible with StatusBadge)
 * - getStatusLabel: function to get label by value key
 * - loading: boolean
 */
export const useStatusProcesso = () => {
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>(cachedOptions || []);
  const [loading, setLoading] = useState(!cachedOptions);

  useEffect(() => {
    if (cachedOptions) {
      setStatusOptions(cachedOptions);
      setLoading(false);
      return;
    }

    if (!cachePromise) {
      cachePromise = fetchStatusOptions();
    }

    cachePromise.then((options) => {
      setStatusOptions(options);
      setLoading(false);
    });
  }, []);

  const statusLabels: Record<string, string> = {};
  statusOptions.forEach(opt => {
    statusLabels[opt.value] = opt.label;
  });

  const getStatusLabel = (key: string): string => {
    return statusLabels[key] || key;
  };

  return { statusOptions, statusLabels, getStatusLabel, loading };
};

/**
 * Invalidate the cache (call after adding/editing status in parametros_campos)
 */
export const invalidateStatusCache = () => {
  cachedOptions = null;
  cachePromise = null;
};

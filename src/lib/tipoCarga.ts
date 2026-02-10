import { supabase } from "@/integrations/supabase/client";

// Static fallback mapping (used when DB is unavailable)
const TIPO_CARGA_FALLBACK: Record<string, string> = {
  "Carga geral": "Dry",
  "Carga refrigerada": "Reefer",
  "Produto perigoso": "IMO",
  "Carga excesso": "OOG",
  "Carga projeto": "Breakbulk",
  "Dry": "Dry",
  "Reefer": "Reefer",
  "IMO": "IMO",
  "IMDG": "IMO",
  "OOG": "OOG",
  "Breakbulk": "Breakbulk",
  "Carga Excesso de dimensoes": "OOG",
  "Carga Excesso de dimensões": "OOG",
};

// Dynamic cache from parametros_campos
let cachedMap: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const loadFromDB = async (): Promise<Record<string, string>> => {
  const now = Date.now();
  if (cachedMap && now - cacheTimestamp < CACHE_TTL) {
    return cachedMap;
  }

  try {
    const { data } = await supabase
      .from("parametros_campos")
      .select("valor, sigla")
      .eq("grupo", "tipo_carga")
      .eq("ativo", true);

    if (data && data.length > 0) {
      const map: Record<string, string> = {};
      for (const item of data) {
        // If sigla exists, use sigla as display; otherwise use valor directly
        const display = item.sigla || item.valor;
        map[item.valor] = display;
        // Also map the sigla itself to itself for direct matches
        if (item.sigla) {
          map[item.sigla] = display;
        }
      }
      cachedMap = map;
      cacheTimestamp = now;
      return map;
    }
  } catch {
    // Fallback on error
  }

  return TIPO_CARGA_FALLBACK;
};

// Preload cache on module init
loadFromDB();

export const formatTipoCarga = (tipoCarga: string | null): string => {
  if (!tipoCarga) return "—";

  // Check dynamic cache first
  if (cachedMap) {
    if (cachedMap[tipoCarga]) return cachedMap[tipoCarga];
  }

  // Check static fallback
  if (TIPO_CARGA_FALLBACK[tipoCarga]) return TIPO_CARGA_FALLBACK[tipoCarga];

  // Fuzzy match for legacy data
  const lower = tipoCarga.toLowerCase();
  if (lower.includes("dry") || lower.includes("seco") || lower.includes("geral")) return "Dry";
  if (lower.includes("reefer") || lower.includes("refriger")) return "Reefer";
  if (lower.includes("imo") || lower.includes("perigos") || lower.includes("imdg")) return "IMO";
  if (lower.includes("oog") || lower.includes("over") || lower.includes("exces") || lower.includes("dimenso") || lower.includes("dimensõ")) return "OOG";
  if (lower.includes("breakbulk") || lower.includes("projeto")) return "Breakbulk";

  return tipoCarga;
};

// Force refresh cache (e.g., after admin changes parametros_campos)
export const refreshTipoCargaCache = () => {
  cachedMap = null;
  cacheTimestamp = 0;
  loadFromDB();
};

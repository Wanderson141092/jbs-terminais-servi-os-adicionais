// Mapping of tipo_carga values to their abbreviations
// These must be shown exactly as written, never translated
export const TIPO_CARGA_SIGLAS: Record<string, string> = {
  "Carga geral": "Dry",
  "Carga refrigerada": "Reefer",
  "Produto perigoso": "IMO",
  "Carga excesso": "OOG",
  "Carga projeto": "Breakbulk",
  // Legacy/fallback mappings
  "Dry": "Dry",
  "Reefer": "Reefer",
  "IMO": "IMO",
  "OOG": "OOG",
  "Breakbulk": "Breakbulk",
};

export const formatTipoCarga = (tipoCarga: string | null): string => {
  if (!tipoCarga) return "—";
  
  // Direct match
  if (TIPO_CARGA_SIGLAS[tipoCarga]) return TIPO_CARGA_SIGLAS[tipoCarga];
  
  // Fuzzy match for legacy data
  const lower = tipoCarga.toLowerCase();
  if (lower.includes("dry") || lower.includes("seco") || lower.includes("geral")) return "Dry";
  if (lower.includes("reefer") || lower.includes("refriger")) return "Reefer";
  if (lower.includes("imo") || lower.includes("perigos")) return "IMO";
  if (lower.includes("oog") || lower.includes("over") || lower.includes("exces")) return "OOG";
  if (lower.includes("breakbulk") || lower.includes("projeto")) return "Breakbulk";
  
  return tipoCarga;
};

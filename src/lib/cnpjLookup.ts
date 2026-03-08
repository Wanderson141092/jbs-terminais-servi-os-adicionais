/**
 * Consulta dados de CNPJ via BrasilAPI (gratuita, sem chave).
 * Retorna razão social ou null em caso de falha.
 */

const CNPJ_REGEX = /^\d{14}$/;

export const stripCnpjMask = (cnpj: string): string =>
  cnpj.replace(/[.\-\/\s]/g, "");

export const isValidCnpj = (cnpj: string): boolean =>
  CNPJ_REGEX.test(stripCnpjMask(cnpj));

export interface CnpjResult {
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  situacao_cadastral?: string;
}

let lastFetched = "";
let lastResult: CnpjResult | null = null;

export const fetchCnpjData = async (rawCnpj: string): Promise<CnpjResult | null> => {
  const cnpj = stripCnpjMask(rawCnpj);
  if (!isValidCnpj(cnpj)) return null;

  // Avoid duplicate calls for the same CNPJ
  if (cnpj === lastFetched && lastResult) return lastResult;

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!res.ok) return null;
    const data = await res.json();
    lastFetched = cnpj;
    lastResult = {
      razao_social: data.razao_social || "",
      nome_fantasia: data.nome_fantasia || null,
      cnpj: data.cnpj || cnpj,
      situacao_cadastral: data.descricao_situacao_cadastral,
    };
    return lastResult;
  } catch {
    return null;
  }
};

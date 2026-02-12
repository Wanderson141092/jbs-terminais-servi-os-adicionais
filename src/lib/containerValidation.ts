/**
 * Formatação e validação rigorosa de número de contêiner.
 * Regra: 4 letras (a 4ª obrigatoriamente "U") + 7 dígitos = 11 caracteres total.
 * Sempre maiúsculo, sem exceder limites.
 */

/** Máscara de entrada: permite digitar progressivamente e bloqueia caracteres inválidos */
export function formatContainerInput(raw: string): string {
  let result = "";
  const upper = raw.toUpperCase();

  for (let i = 0; i < upper.length && result.length < 11; i++) {
    const ch = upper[i];
    const pos = result.length;

    if (pos < 3) {
      // Posições 0-2: apenas letras A-Z
      if (/[A-Z]/.test(ch)) result += ch;
    } else if (pos === 3) {
      // Posição 3: obrigatoriamente "U"
      if (ch === "U") result += ch;
    } else if (pos < 11) {
      // Posições 4-10: apenas dígitos
      if (/\d/.test(ch)) result += ch;
    }
  }

  return result;
}

/** Validação completa: retorna true se o contêiner está no formato correto */
export function isValidContainer(value: string): boolean {
  return /^[A-Z]{3}U\d{7}$/.test(value);
}

/** Verifica se o valor parece ser um contêiner (começa com letras) */
export function looksLikeContainer(value: string): boolean {
  return /^[A-Z]{1,4}\d{0,7}$/.test(value) && value.length >= 4;
}

/** Mensagem de erro para contêiner inválido */
export function getContainerErrorMessage(value: string): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();

  if (/^[A-Z]{4}/.test(upper) && upper[3] !== "U") {
    return "A 4ª letra do contêiner deve ser obrigatoriamente 'U'";
  }
  if (/^[A-Z]{3}U/.test(upper) && upper.length < 11) {
    return "Contêiner incompleto — deve ter 11 caracteres (ex: ABCU1234567)";
  }
  if (upper.length > 11) {
    return "Contêiner não pode ter mais de 11 caracteres";
  }
  return null;
}

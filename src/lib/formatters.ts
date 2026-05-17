/**
 * Converte valor em reais (float) para centavos (int)
 */
export function reaisToInt(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Converte valor em centavos para string formatada em BRL
 */
export function formatCurrency(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

/**
 * Converte centavos para reais (float)
 */
export function intToReais(centavos: number): number {
  return centavos / 100;
}

/**
 * Aplica máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
 * conforme a quantidade de dígitos. Máscara puramente visual — o backend
 * recebe só dígitos (os schemas Zod fazem o strip antes de enviar).
 */
export function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/**
 * Aplica máscara de celular brasileiro conforme o usuário digita:
 * (11) 99999-9999 — 11 dígitos (DDD + 9 dígitos). Limita a 11 dígitos.
 * Máscara puramente visual — não altera o que vai ao backend (ambos os
 * forms removem a máscara antes de enviar; só dígitos seguem ao backend).
 *
 * Tolera valores no formato E.164 (+55...): se vier com o código do país
 * 55 na frente (12-13 dígitos), descarta-o antes de mascarar. Necessário
 * pro pré-preenchimento da /conta, onde o telefone do cadastro chega como
 * +5511999999999 e quebraria a máscara de 11 dígitos.
 */
export function maskTelefoneBR(value: string): string {
  let raw = value.replace(/\D/g, "");
  if (raw.length >= 12 && raw.startsWith("55")) {
    raw = raw.slice(2);
  }
  const digits = raw.slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length <= 5) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

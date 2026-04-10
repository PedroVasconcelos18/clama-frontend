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

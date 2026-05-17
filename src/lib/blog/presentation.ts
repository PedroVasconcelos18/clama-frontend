/**
 * Helpers de apresentação do blog público (redesign blog-design).
 *
 * O backend não tem campo `categoria`, então derivamos o badge de
 * `historia_ilustrativa`. Quando não há `imagem_capa_url`, a área de imagem
 * é omitida (decisão de produto) — não há mais placeholder/glow.
 */

/** Label do badge de categoria — derivado, já que o backend não tem o campo. */
export function categoriaLabel(historiaIlustrativa: boolean): string {
  return historiaIlustrativa ? "História" : "Reflexão"
}

/** Inicial maiúscula pra avatares (fallback "C" de Clama). */
export function inicial(nome: string): string {
  const c = nome.trim().charAt(0)
  return c ? c.toUpperCase() : "C"
}

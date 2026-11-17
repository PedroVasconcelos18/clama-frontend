// O clamor entre "/" e "/entrega". sessionStorage quando dá; a memória cobre o storage bloqueado.
export type Rascunho = { tema: string | null; texto: string; risco: boolean | null }

const CHAVE = "clama:rascunho"
let memoria: Rascunho | null = null

export function salvarRascunho(r: Rascunho): void {
  memoria = r
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(r))
  } catch {
    /* storage bloqueado: fica só na memória */
  }
}

export function lerRascunho(): Rascunho | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE)
    if (bruto) {
      const r = JSON.parse(bruto) as Rascunho
      if (typeof r?.texto === "string") return r
    }
  } catch {
    /* ilegível: cai na memória */
  }
  return memoria
}

export function limparRascunho(): void {
  memoria = null
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    /* noop */
  }
}

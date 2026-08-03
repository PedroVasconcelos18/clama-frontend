/**
 * Remove do `localStorage` os tokens gravados sob o modelo anterior ao ADR-01.
 *
 * Migrar o mecanismo para cookie `HttpOnly` não apaga o que já está no
 * navegador: quem já usou o Clama continua com o token antigo legível por
 * qualquer script até que algo o remova. Sem esta purga a exposição persiste
 * exatamente na base de usuárias recorrentes — a que mais importa.
 *
 * Só duas chaves são removidas, literalmente. Nada de `localStorage.clear()`
 * nem varredura por prefixo:
 *
 * - `clama:form-draft` guarda um pedido de oração em andamento
 * - `blog-post-*` guarda rascunhos não salvos do editor
 * - `locale` guarda o idioma escolhido
 *
 * Um `clear()` destruiria os três; um sweep por `clama:` destruiria o rascunho
 * de pedido e não pegaria nenhum `blog-post-*`.
 */
const CHAVES_DE_AUTH_LEGADAS = ["clama:customer-auth", "clama:admin-auth"] as const

export function purgeLegacyTokens(): void {
  if (typeof window === "undefined") return

  for (const chave of CHAVES_DE_AUTH_LEGADAS) {
    const bruto = localStorage.getItem(chave)
    if (!bruto) continue

    // Se o blob ainda carrega token, é do modelo antigo: remove por inteiro.
    // Se já é o formato novo (só `user`), preserva — é sessão válida.
    try {
      const parsed: unknown = JSON.parse(bruto)
      const temToken =
        !!parsed &&
        typeof parsed === "object" &&
        ("accessToken" in parsed || "refreshToken" in parsed)
      if (temToken) localStorage.removeItem(chave)
    } catch {
      // Blob corrompido não tem valor recuperável.
      localStorage.removeItem(chave)
    }
  }
}

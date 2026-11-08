/**
 * Remove do `localStorage` o que os modelos de auth anteriores gravaram.
 *
 * A sessão agora é o cookie `SESSION` HttpOnly e o front não guarda mais o
 * usuário em lugar nenhum; `clama:admin-auth` e `clama:customer-auth` são lixo
 * (com ou sem token) e somem por inteiro. Fica por um ciclo de release.
 *
 * Só essas duas chaves, literalmente. Nada de `localStorage.clear()` nem
 * varredura por prefixo:
 *
 * - `clama:form-draft` guarda um pedido de oração em andamento
 * - `blog-post-*` guarda rascunhos não salvos do editor
 * - `locale` guarda o idioma escolhido
 */
const CHAVES_DE_AUTH_LEGADAS = ["clama:customer-auth", "clama:admin-auth"] as const

export function purgeLegacyTokens(): void {
  if (typeof window === "undefined") return
  for (const chave of CHAVES_DE_AUTH_LEGADAS) localStorage.removeItem(chave)
}

/**
 * Obtenção do token de CSRF para escritas autenticadas por cookie (ADR-01).
 *
 * `CSRF_COOKIE_HTTPONLY = True` no Django impede o JavaScript de ler o cookie,
 * então o padrão double-submit nativo não funciona. O backend expõe o token em
 * `GET /api/csrf/`; guardamos em memória — nunca em storage, para não recriar
 * exatamente o problema que o ADR-01 existe para resolver.
 *
 * O widget de comentários que roda dentro da página do WordPress usa este mesmo
 * caminho: a prova vem da API do Clama, não de nada que o WordPress forneça
 * (AR-FRONTEIRAS — o WordPress nunca é autoridade sobre identidade).
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"])

let tokenEmMemoria: string | null = null
let buscaEmAndamento: Promise<string | null> | null = null

export function exigeCsrf(method?: string): boolean {
  return !METODOS_SEGUROS.has((method ?? "GET").toUpperCase())
}

/** Descarta o token em memória — usar quando o servidor rejeitar por CSRF. */
export function invalidarCsrfToken(): void {
  tokenEmMemoria = null
}

/**
 * Devolve o token, buscando-o na primeira vez. Chamadas concorrentes
 * compartilham a mesma requisição.
 */
export async function getCsrfToken(): Promise<string | null> {
  if (tokenEmMemoria) return tokenEmMemoria
  if (!buscaEmAndamento) {
    buscaEmAndamento = (async () => {
      try {
        const resp = await fetch(`${BASE_URL}/api/csrf/`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        })
        if (!resp.ok) return null
        const corpo = (await resp.json()) as { csrf_token?: string }
        tokenEmMemoria = corpo.csrf_token ?? null
        return tokenEmMemoria
      } catch {
        return null
      } finally {
        buscaEmAndamento = null
      }
    })()
  }
  return buscaEmAndamento
}

/** Headers de CSRF para o método dado — vazio em métodos seguros. */
export async function csrfHeaders(
  method?: string,
): Promise<Record<string, string>> {
  if (!exigeCsrf(method)) return {}
  const token = await getCsrfToken()
  return token ? { "X-CSRFToken": token } : {}
}

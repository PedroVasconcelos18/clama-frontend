/**
 * CSRF de SPA: o servidor emite o cookie `XSRF-TOKEN` (legível por JS) em
 * toda resposta e exige o header `X-XSRF-TOKEN` em todo método não seguro,
 * inclusive nos POSTs anônimos (login). O token muda no login, então o
 * cookie é lido a cada chamada, nunca guardado.
 */

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"])

export function exigeCsrf(method?: string): boolean {
  return !METODOS_SEGUROS.has((method ?? "GET").toUpperCase())
}

function lerCookieXsrf(): string | null {
  if (typeof document === "undefined") return null
  for (const par of document.cookie.split(";")) {
    const i = par.indexOf("=")
    if (i > 0 && par.slice(0, i).trim() === "XSRF-TOKEN") {
      const valor = par.slice(i + 1).trim()
      try {
        return decodeURIComponent(valor) || null
      } catch {
        return valor || null
      }
    }
  }
  return null
}

/** Headers de CSRF para o método dado — vazio em métodos seguros. */
export function csrfHeaders(method?: string): Record<string, string> {
  if (!exigeCsrf(method)) return {}
  const token = lerCookieXsrf()
  return token ? { "X-XSRF-TOKEN": token } : {}
}

/**
 * Validates a `?next=...` query param to prevent open-redirect attacks.
 *
 * Rules:
 * - null/empty → fallback
 * - protocol-relative URL (`//evil.com`) → fallback
 * - any string not starting with `/` → fallback (no relative paths)
 * - contains a colon-prefix scheme (`javascript:`, `http:`, etc.) → fallback
 * - backslash-prefix (`/\evil`) → fallback (some browsers normalize `\` to `/`)
 *
 * Otherwise returns the raw value.
 */
export function validateNextPath(
  rawNext: string | null | undefined,
  fallback: string = "/",
): string {
  if (!rawNext) return fallback

  // Reject protocol-relative URLs like //evil.com or /\evil.com
  if (rawNext.startsWith("//") || rawNext.startsWith("/\\")) return fallback

  // Must start with a single slash
  if (!rawNext.startsWith("/")) return fallback

  // Reject anything that looks like a scheme (javascript:, http:, etc.)
  // We check against a lone colon anywhere in the string before any "?" or "#";
  // a scheme is `^[a-zA-Z][a-zA-Z0-9+.-]*:`. Since the value starts with `/`,
  // we can't match a leading scheme — but URL parsers can be tricked by
  // characters like `\` so we still drop any colon found before the first `?`/`#`.
  const queryStart = rawNext.search(/[?#]/)
  const pathPart = queryStart === -1 ? rawNext : rawNext.slice(0, queryStart)
  if (pathPart.includes(":")) return fallback

  return rawNext
}

/** Prefixos servidos pelo Vike (rotas fora do React Router). */
const VIKE_ROUTE_PREFIXES = ["/blog"] as const

export function isVikeRoute(path: string): boolean {
  return VIKE_ROUTE_PREFIXES.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      path.startsWith(`${prefix}?`),
  )
}

type NavigateFn = (to: string, options?: { replace?: boolean }) => void

/**
 * Roteia pra `next` após autenticação. Se `next` aponta pra rota Vike,
 * faz hard navigation — react-router não conhece essas rotas e renderiza 404.
 */
export function goToNext(
  navigate: NavigateFn,
  next: string,
  options?: { replace?: boolean },
): void {
  if (isVikeRoute(next)) {
    if (typeof window !== "undefined") {
      if (options?.replace) window.location.replace(next)
      else window.location.assign(next)
    }
    return
  }
  navigate(next, options)
}

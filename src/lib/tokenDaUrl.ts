/**
 * Lê o token do fragmento (`#token=…`, que não chega ao servidor nem aos logs da CDN) e o tira da barra de endereço.
 * Cai para `?token=` por causa dos links já enviados por e-mail.
 */
export function lerTokenETirarDaUrl(): string {
  const url = new URL(window.location.href)
  const doHash = new URLSearchParams(url.hash.replace(/^#/, "")).get("token")
  const daQuery = url.searchParams.get("token")
  const token = (doHash ?? daQuery ?? "").trim()
  if (doHash !== null || daQuery !== null) {
    url.searchParams.delete("token")
    window.history.replaceState(window.history.state, "", url.pathname + url.search)
  }
  return token
}

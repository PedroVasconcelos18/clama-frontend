/**
 * Leitura do corpo de erro da API (`application/problem+json`):
 * `{type, title, status, detail, codigo, mensagemPastoral, erros[{campo, mensagem}]}`.
 * `type` e `title` nunca viram texto de tela.
 */
import { getGenericError } from "@/i18n"

type Corpo = Record<string, unknown>

const CAMPOS_DO_PROBLEMA = new Set([
  "type",
  "title",
  "status",
  "detail",
  "instance",
  "codigo",
  "mensagemPastoral",
  "erros",
])

const ehCorpo = (b: unknown): b is Corpo => !!b && typeof b === "object"
const texto = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null

export function extractErrorMessage(body: unknown): string {
  if (!ehCorpo(body)) return getGenericError()

  const pastoral = texto(body.mensagemPastoral)
  if (pastoral) return pastoral

  if (Array.isArray(body.erros)) {
    const mensagens = body.erros
      .map((e) => (ehCorpo(e) ? texto(e.mensagem) : null))
      .filter((m): m is string => m !== null)
    if (mensagens.length > 0) return mensagens.join(" ")
  }

  return texto(body.detail) ?? getGenericError()
}

export function extrairCodigo(body: unknown): string {
  return (ehCorpo(body) && texto(body.codigo)) || "unknown"
}

/** Campos do corpo fora do envelope do problema (ex.: `redirect` num 409). */
export function extrairExtra(body: unknown): Record<string, unknown> {
  if (!ehCorpo(body)) return {}
  return Object.fromEntries(
    Object.entries(body).filter(([k]) => !CAMPOS_DO_PROBLEMA.has(k)),
  )
}

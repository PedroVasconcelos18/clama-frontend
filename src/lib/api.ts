import { toast } from "sonner"
import {
  translateError,
  getGenericError,
  getNetworkError,
  getLocale,
} from "@/i18n"

export class PastoralApiError extends Error {
  code: string
  pastoralMessage: string
  httpStatus: number

  constructor(
    message: string,
    code: string,
    pastoralMessage: string,
    httpStatus: number
  ) {
    super(message)
    this.name = "PastoralApiError"
    this.code = code
    this.pastoralMessage = pastoralMessage
    this.httpStatus = httpStatus
  }
}

/**
 * Exibe o erro como toast e re-lança a exceção.
 * Use em blocos catch para mostrar feedback visual ao usuário.
 */
export function showErrorToast(err: unknown): never {
  const message =
    err instanceof PastoralApiError
      ? err.pastoralMessage
      : "Algo não saiu como o esperado. Tente novamente."
  toast.error(message)
  throw err
}

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

/**
 * Extrai mensagem de erro de diferentes formatos de resposta do backend.
 * Suporta:
 * - { error: { pastoral_message } }
 * - { pastoral_message }
 * - { detail }
 * - { message } ou { msg }
 * - { campo: ["erro1", "erro2"] } (validação DRF)
 * - { campo: "erro" }
 *
 * Traduz automaticamente mensagens do DRF para o idioma configurado.
 */
function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return getGenericError()

  const parsed = body as Record<string, unknown>

  // Formato { error: { pastoral_message } } - já vem traduzida do backend
  const err = parsed.error as Record<string, unknown> | undefined
  if (err?.pastoral_message) return String(err.pastoral_message)

  // Formatos diretos - já vem traduzidos do backend
  if (parsed.pastoral_message) return String(parsed.pastoral_message)
  if (parsed.detail) return translateError(String(parsed.detail))
  if (parsed.message) return translateError(String(parsed.message))
  if (parsed.msg) return translateError(String(parsed.msg))

  // Formato de validação DRF: { campo: ["erro"] } ou { campo: "erro" }
  const fieldErrors: string[] = []
  for (const [, value] of Object.entries(parsed)) {
    if (Array.isArray(value)) {
      fieldErrors.push(...value.map((v) => translateError(String(v))))
    } else if (typeof value === "string") {
      fieldErrors.push(translateError(value))
    }
  }

  if (fieldErrors.length > 0) {
    return fieldErrors.join(" ")
  }

  return getGenericError()
}

interface ApiFetchOptions extends RequestInit {
  /** Se false, não exibe toast de erro automaticamente. Default: true */
  showToast?: boolean
}

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions
): Promise<T> {
  const { showToast = true, ...fetchInit } = init ?? {}

  const headers: HeadersInit = {
    Accept: "application/json",
    "Accept-Language": getLocale(),
    ...(fetchInit?.body ? { "Content-Type": "application/json" } : {}),
    ...fetchInit?.headers,
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...fetchInit, headers })
  } catch {
    const error = new PastoralApiError(
      "Sem conexão",
      "network_error",
      getNetworkError(),
      0
    )
    if (showToast) toast.error(error.pastoralMessage)
    throw error
  }

  if (!response.ok) {
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      /* noop */
    }

    const pastoralMessage = extractErrorMessage(body)

    const error = new PastoralApiError(
      "Erro",
      "validation_error",
      pastoralMessage,
      response.status
    )

    if (showToast) toast.error(error.pastoralMessage)
    throw error
  }

  return response.json() as Promise<T>
}

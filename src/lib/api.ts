import { toast } from "sonner"
import { getNetworkError, getLocale } from "@/i18n"
import { csrfHeaders, exigeCsrf, lerCookieXsrf } from "@/lib/csrf"
import { extractErrorMessage, extrairCampos, extrairCodigo, extrairExtra } from "@/lib/erros"

export class PastoralApiError extends Error {
  code: string
  pastoralMessage: string
  httpStatus: number
  /**
   * Campos do corpo fora do envelope do problema (ex.: `redirect` em 409
   * conta_existente). `codigo`, `mensagemPastoral` e `erros` têm
   * tratamento próprio.
   */
  extra: Record<string, unknown>
  /** Mensagem por campo, vinda de `erros[{campo, mensagem}]`. */
  campos: Record<string, string>

  constructor(
    message: string,
    code: string,
    pastoralMessage: string,
    httpStatus: number,
    extra: Record<string, unknown> = {},
    campos: Record<string, string> = {}
  ) {
    super(message)
    this.name = "PastoralApiError"
    this.code = code
    this.pastoralMessage = pastoralMessage
    this.httpStatus = httpStatus
    this.extra = extra
    this.campos = campos
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

interface ApiFetchOptions extends RequestInit {
  /** Se false, não exibe toast de erro automaticamente. Default: true */
  showToast?: boolean
}

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions
): Promise<T> {
  const { showToast = true, ...fetchInit } = init ?? {}

  // Escrita antes de o boot (GET /api/auth/eu) ter emitido o XSRF-TOKEN: pede o cookie agora.
  if (exigeCsrf(fetchInit.method) && !lerCookieXsrf()) {
    try {
      await fetch(`${BASE_URL}/api/auth/eu`, { credentials: "include", headers: { Accept: "application/json" } })
    } catch {
      /* sem rede: o POST abaixo falha com o erro de rede de sempre */
    }
  }

  // FormData: o browser define o Content-Type com o boundary.
  const isFormData = fetchInit.body instanceof FormData
  const headers: HeadersInit = {
    Accept: "application/json",
    // Toda escrita (inclusive o login anônimo) leva o XSRF-TOKEN lido do cookie.
    ...csrfHeaders(fetchInit.method),
    "Accept-Language": getLocale(),
    ...(fetchInit.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...fetchInit.headers,
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...fetchInit,
      headers,
      credentials: "include",
    })
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

    const error = new PastoralApiError(
      "Erro",
      extrairCodigo(body),
      extractErrorMessage(body),
      response.status,
      extrairExtra(body),
      extrairCampos(body)
    )

    if (showToast) toast.error(error.pastoralMessage)
    throw error
  }

  // 202 (tarefa enfileirada) também vem sem corpo
  if ([202, 204, 205].includes(response.status)) return {} as T
  return response.json() as Promise<T>
}

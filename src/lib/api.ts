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

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...init?.headers,
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new PastoralApiError(
      "Sem conexão",
      "network_error",
      "Parece que sua conexão oscilou. Tente novamente daqui a pouco.",
      0
    )
  }

  if (!response.ok) {
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      /* noop */
    }
    const err = (body as { error?: { code?: string; message?: string; pastoral_message?: string } })?.error
    if (err?.pastoral_message) {
      throw new PastoralApiError(
        err.message ?? "Erro",
        err.code ?? "unknown",
        err.pastoral_message,
        response.status
      )
    }
    throw new PastoralApiError(
      "Erro inesperado",
      "unknown",
      "Algo não saiu como o esperado. Vamos tentar de novo em instantes.",
      response.status
    )
  }

  return response.json() as Promise<T>
}

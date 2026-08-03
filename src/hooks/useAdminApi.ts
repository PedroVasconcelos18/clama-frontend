/**
 * Hook for authenticated admin API calls.
 *
 * CONVENTION: All admin pages (Epic 4) must use this hook exclusively
 * for API calls. Never use raw apiFetch for admin endpoints.
 *
 * Features:
 * - Autenticação por cookie HttpOnly (ADR-01) — sem header Authorization
 * - Transparent token refresh on 401
 * - Auto-logout if refresh fails
 * - Automatic error toast display (opt-out with showToast: false)
 */

import { useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { PastoralApiError } from "@/lib/api"
import {
  translateError,
  getGenericError,
  getNetworkError,
  getSessionExpiredError,
  getLocale,
} from "@/i18n"
import { csrfHeaders } from "@/lib/csrf"

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

interface AdminFetchOptions extends RequestInit {
  /** Se false, não exibe toast de erro automaticamente. Default: true */
  showToast?: boolean
}

export function useAdminApi() {
  const { refreshAccessToken, logout } = useAuth()
  const navigate = useNavigate()
  // Promise de refresh compartilhada: 401s concorrentes aguardam o MESMO
  // refresh e cada um repete sua chamada. O guard booleano anterior fazia os
  // concorrentes PULAREM a retentativa — com access de 15 min (ADR-01) o
  // refresh passa a ser frequente e essa corrida deixa de ser teórica.
  const refreshInFlight = useRef<Promise<boolean> | null>(null)

  const adminFetch = useCallback(
    async <T>(path: string, init?: AdminFetchOptions): Promise<T> => {
      const { showToast = true, ...fetchInit } = init ?? {}

      const doFetch = async (): Promise<Response> => {
        // Não adiciona Content-Type para FormData (browser define automaticamente com boundary)
        const isFormData = fetchInit?.body instanceof FormData
        const headers: HeadersInit = {
          Accept: "application/json",
          // Escritas autenticadas por cookie exigem prova de CSRF (ADR-01).
          // Fica ANTES do spread de fetchInit.headers para o chamador poder
          // sobrescrever, e vale também no caminho de FormData.
          ...(await csrfHeaders(fetchInit?.method)),
          "Accept-Language": getLocale(),
          ...(fetchInit?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
          ...fetchInit?.headers,
        }

        try {
          return await fetch(`${BASE_URL}${path}`, {
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
      }

      // First attempt with current token
      let response = await doFetch()

      // Em 401, renova uma vez e repete.
      if (response.status === 401) {
        if (!refreshInFlight.current) {
          refreshInFlight.current = refreshAccessToken().finally(() => {
            refreshInFlight.current = null
          })
        }
        const renovou = await refreshInFlight.current
        if (renovou) {
          response = await doFetch()
        } else {
          logout()
          navigate("/admin/login", { replace: true })
          const error = new PastoralApiError(
            "Sessão expirada",
            "session_expired",
            getSessionExpiredError(),
            401
          )
          if (showToast) toast.error(error.pastoralMessage)
          throw error
        }
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

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return {} as T
      }

      return response.json() as Promise<T>
    },
    [refreshAccessToken, logout, navigate]
  )

  return { adminFetch }
}

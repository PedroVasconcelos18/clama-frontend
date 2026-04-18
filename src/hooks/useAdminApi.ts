/**
 * Hook for authenticated admin API calls.
 *
 * CONVENTION: All admin pages (Epic 4) must use this hook exclusively
 * for API calls. Never use raw apiFetch for admin endpoints.
 *
 * Features:
 * - Automatic JWT injection via Authorization header
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
  const { accessToken, refreshAccessToken, logout } = useAuth()
  const navigate = useNavigate()
  const isRefreshing = useRef(false)

  const adminFetch = useCallback(
    async <T>(path: string, init?: AdminFetchOptions): Promise<T> => {
      const { showToast = true, ...fetchInit } = init ?? {}

      const doFetch = async (token: string | null): Promise<Response> => {
        // Não adiciona Content-Type para FormData (browser define automaticamente com boundary)
        const isFormData = fetchInit?.body instanceof FormData
        const headers: HeadersInit = {
          Accept: "application/json",
          "Accept-Language": getLocale(),
          ...(fetchInit?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...fetchInit?.headers,
        }

        try {
          return await fetch(`${BASE_URL}${path}`, { ...fetchInit, headers })
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
      let response = await doFetch(accessToken)

      // On 401, try to refresh token and retry once
      if (response.status === 401 && !isRefreshing.current) {
        isRefreshing.current = true
        try {
          const newToken = await refreshAccessToken()
          if (newToken) {
            response = await doFetch(newToken)
          } else {
            // Refresh failed, redirect to login
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
        } finally {
          isRefreshing.current = false
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
    [accessToken, refreshAccessToken, logout, navigate]
  )

  return { adminFetch }
}

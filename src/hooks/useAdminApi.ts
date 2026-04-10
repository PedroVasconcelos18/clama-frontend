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
 */

import { useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { PastoralApiError } from "@/lib/api"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export function useAdminApi() {
  const { accessToken, refreshAccessToken, logout } = useAuth()
  const navigate = useNavigate()
  const isRefreshing = useRef(false)

  const adminFetch = useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      const doFetch = async (token: string | null): Promise<Response> => {
        const headers: HeadersInit = {
          Accept: "application/json",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        }

        try {
          return await fetch(`${BASE_URL}${path}`, { ...init, headers })
        } catch {
          throw new PastoralApiError(
            "Sem conexão",
            "network_error",
            "Parece que sua conexão oscilou. Tente novamente daqui a pouco.",
            0
          )
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
            throw new PastoralApiError(
              "Sessão expirada",
              "session_expired",
              "Sua sessão expirou. Por favor, faça login novamente.",
              401
            )
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
        const err = (
          body as { error?: { code?: string; message?: string; pastoral_message?: string } }
        )?.error
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
          "Algo não saiu como o esperado. Tente novamente.",
          response.status
        )
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

/**
 * Hook for authenticated customer API calls.
 *
 * CONVENTION: Customer-facing pages that need Bearer auth must use this hook
 * exclusively. Mirrors `useAdminApi` but consumes `CustomerAuthContext` and
 * uses customer refresh endpoint.
 *
 * Features:
 * - Automatic JWT injection via Authorization header
 * - Transparent token refresh on 401
 * - Auto-logout if refresh fails
 * - Automatic error toast display (opt-out with showToast: false)
 */

import { useCallback, useRef } from "react"
import { toast } from "sonner"
import { useCustomerAuth } from "@/contexts/CustomerAuthContext"
import { PastoralApiError } from "@/lib/api"
import {
  translateError,
  getGenericError,
  getNetworkError,
  getSessionExpiredError,
  getLocale,
} from "@/i18n"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return getGenericError()

  const parsed = body as Record<string, unknown>

  const err = parsed.error as Record<string, unknown> | undefined
  if (err?.pastoral_message) return String(err.pastoral_message)

  if (parsed.pastoral_message) return String(parsed.pastoral_message)
  if (parsed.detail) return translateError(String(parsed.detail))
  if (parsed.message) return translateError(String(parsed.message))
  if (parsed.msg) return translateError(String(parsed.msg))

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

interface CustomerFetchOptions extends RequestInit {
  /** Se false, não exibe toast de erro automaticamente. Default: true */
  showToast?: boolean
}

export function useCustomerApi() {
  const { accessToken, refreshAccessToken, logout } = useCustomerAuth()
  // Shared in-flight refresh promise: concurrent 401s await the same refresh
  // and each retries with the resulting token. Avoids the boolean-flag race
  // where parallel callers would see "another refresh is happening" and skip
  // their retry entirely.
  const refreshInFlight = useRef<Promise<string | null> | null>(null)

  const customerFetch = useCallback(
    async <T>(path: string, init?: CustomerFetchOptions): Promise<T> => {
      const { showToast = true, ...fetchInit } = init ?? {}

      const doFetch = async (token: string | null): Promise<Response> => {
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

      // On 401, refresh once (shared promise) and retry. Concurrent callers
      // await the same in-flight refresh, then each retries with the fresh token.
      if (response.status === 401) {
        if (!refreshInFlight.current) {
          refreshInFlight.current = refreshAccessToken().finally(() => {
            refreshInFlight.current = null
          })
        }
        const newToken = await refreshInFlight.current
        if (newToken) {
          response = await doFetch(newToken)
        } else {
          // refreshAccessToken already cleared local auth on 401-blacklisted.
          // Make sure storage/state are clean and route the user to /login.
          await logout()
          if (typeof window !== "undefined") {
            window.location.assign("/login")
          }
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

      // Handle empty responses (204 No Content / 205 Reset)
      if (response.status === 204 || response.status === 205) {
        return {} as T
      }

      return response.json() as Promise<T>
    },
    [accessToken, refreshAccessToken, logout]
  )

  return { customerFetch }
}

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { apiFetch, PastoralApiError } from "@/lib/api"
import { logout as logoutRequest, LogoutError } from "@/lib/api/customer"

export interface CustomerUser {
  id: string
  email: string
  nome_completo: string
  force_change_password: boolean
  freemium_used_at: string | null
}

interface CustomerAuthState {
  user: CustomerUser | null
  accessToken: string | null
  refreshToken: string | null
}

interface LoginResponse {
  access: string
  refresh: string
  user: CustomerUser
}

interface RefreshResponse {
  access: string
}

interface CustomerAuthContextValue {
  user: CustomerUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<CustomerUser>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<string | null>
  setUser: (user: CustomerUser) => void
}

const CUSTOMER_AUTH_STORAGE_KEY = "clama:customer-auth"

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null)

const EMPTY_AUTH: CustomerAuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
}

/**
 * Valida o formato do estado persistido no storage.
 * Rejeita JSONs parciais que poderiam fazer o app se comportar como
 * autenticado sem credenciais reais.
 */
function isValidAuthState(value: unknown): value is CustomerAuthState {
  if (!value || typeof value !== "object") return false
  const obj = value as Record<string, unknown>

  if (typeof obj.accessToken !== "string" || obj.accessToken.length === 0) return false
  if (typeof obj.refreshToken !== "string" || obj.refreshToken.length === 0) return false

  const user = obj.user
  if (!user || typeof user !== "object") return false
  const u = user as Record<string, unknown>
  if (typeof u.id !== "string" || u.id.length === 0) return false
  if (typeof u.email !== "string" || u.email.length === 0) return false

  return true
}

function loadAuthFromStorage(): CustomerAuthState {
  try {
    const stored = localStorage.getItem(CUSTOMER_AUTH_STORAGE_KEY)
    if (!stored) return EMPTY_AUTH

    const parsed: unknown = JSON.parse(stored)
    if (!isValidAuthState(parsed)) {
      // Shape parcial / corrompido — não confie, limpa.
      localStorage.removeItem(CUSTOMER_AUTH_STORAGE_KEY)
      return EMPTY_AUTH
    }
    return parsed
  } catch {
    try {
      localStorage.removeItem(CUSTOMER_AUTH_STORAGE_KEY)
    } catch {
      /* noop */
    }
    return EMPTY_AUTH
  }
}

function saveAuthToStorage(state: CustomerAuthState): void {
  localStorage.setItem(CUSTOMER_AUTH_STORAGE_KEY, JSON.stringify(state))
}

function clearAuthFromStorage(): void {
  localStorage.removeItem(CUSTOMER_AUTH_STORAGE_KEY)
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<CustomerAuthState>(() => loadAuthFromStorage())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (authState.user) {
      saveAuthToStorage(authState)
    }
  }, [authState])

  const login = useCallback(async (email: string, password: string): Promise<CustomerUser> => {
    const data = await apiFetch<LoginResponse>("/api/customer/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      showToast: false,
    })

    const newState: CustomerAuthState = {
      user: data.user,
      accessToken: data.access,
      refreshToken: data.refresh,
    }
    setAuthState(newState)
    saveAuthToStorage(newState)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    const refresh = authState.refreshToken
    const access = authState.accessToken
    // Always clear locally — idempotent UX
    setAuthState(EMPTY_AUTH)
    clearAuthFromStorage()

    if (refresh && access) {
      try {
        await logoutRequest(refresh, access)
      } catch (err) {
        // Backend é idempotente em 205 mesmo pra refresh já blacklisted.
        // Aqui só caímos em 4xx/5xx genuínos ou erro de rede. Logamos e
        // seguimos — storage local já foi limpo.
        if (err instanceof LogoutError) {
          // eslint-disable-next-line no-console
          console.warn(`[CustomerAuth] logout request failed (${err.httpStatus})`)
        } else {
          // eslint-disable-next-line no-console
          console.warn("[CustomerAuth] logout request failed", err)
        }
      }
    }
  }, [authState.refreshToken, authState.accessToken])

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!authState.refreshToken) {
      setAuthState(EMPTY_AUTH)
      clearAuthFromStorage()
      return null
    }

    try {
      const data = await apiFetch<RefreshResponse>("/api/customer/auth/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh: authState.refreshToken }),
        showToast: false,
      })

      const newState: CustomerAuthState = {
        ...authState,
        accessToken: data.access,
      }
      setAuthState(newState)
      saveAuthToStorage(newState)
      return data.access
    } catch (err) {
      if (err instanceof PastoralApiError && err.httpStatus === 401) {
        setAuthState(EMPTY_AUTH)
        clearAuthFromStorage()
      }
      return null
    }
  }, [authState])

  const setUser = useCallback((user: CustomerUser) => {
    setAuthState((prev) => {
      const next = { ...prev, user }
      saveAuthToStorage(next)
      return next
    })
  }, [])

  const value: CustomerAuthContextValue = {
    user: authState.user,
    accessToken: authState.accessToken,
    refreshToken: authState.refreshToken,
    isAuthenticated: !!authState.user,
    isLoading,
    login,
    logout,
    refreshAccessToken,
    setUser,
  }

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const context = useContext(CustomerAuthContext)
  if (!context) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider")
  }
  return context
}

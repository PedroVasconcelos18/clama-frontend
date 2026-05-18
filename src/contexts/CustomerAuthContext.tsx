import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { apiFetch, PastoralApiError } from "@/lib/api"
import { logout as logoutRequest, LogoutError } from "@/lib/api/customer"

export interface CustomerUser {
  id: number
  email: string
  nome_completo: string
  force_change_password: boolean
  freemium_used_at: string | null
  /** Dados de cadastro do próprio dono — pré-preenchem o form de pedido. */
  cpf_cnpj?: string
  telefone?: string
  idade?: number | null
  sexo?: string
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
  if (typeof u.id !== "number" || !Number.isFinite(u.id)) return false
  if (typeof u.email !== "string" || u.email.length === 0) return false

  return true
}

function loadAuthFromStorage(): CustomerAuthState {
  if (typeof window === "undefined") return EMPTY_AUTH
  try {
    const stored = localStorage.getItem(CUSTOMER_AUTH_STORAGE_KEY)
    if (!stored) return EMPTY_AUTH

    const parsed: unknown = JSON.parse(stored)
    if (!isValidAuthState(parsed)) {
      // eslint-disable-next-line no-console
      console.warn("[CustomerAuth] storage rejected by validator", parsed)
      return EMPTY_AUTH
    }
    return parsed
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[CustomerAuth] storage parse error", err)
    return EMPTY_AUTH
  }
}

function saveAuthToStorage(state: CustomerAuthState): void {
  if (typeof window === "undefined") return
  // eslint-disable-next-line no-console
  console.log("[CustomerAuth] save", { hasUser: !!state.user })
  localStorage.setItem(CUSTOMER_AUTH_STORAGE_KEY, JSON.stringify(state))
}

function clearAuthFromStorage(): void {
  if (typeof window === "undefined") return
  // eslint-disable-next-line no-console
  console.trace("[CustomerAuth] clear storage")
  localStorage.removeItem(CUSTOMER_AUTH_STORAGE_KEY)
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  // Server renders EMPTY_AUTH (sem localStorage). Client inicializa
  // sincronamente do storage no useState init — state já está correto na
  // primeira renderização cliente. Consumidores que mostram UI auth-dependente
  // DEVEM gatear com isClient/isLoading pra evitar mismatch de hidratação.
  const [authState, setAuthState] = useState<CustomerAuthState>(() => {
    if (typeof window === "undefined") return EMPTY_AUTH
    const loaded = loadAuthFromStorage()
    // eslint-disable-next-line no-console
    console.log("[CustomerAuth] init from storage", {
      hasUser: !!loaded.user,
      raw: localStorage.getItem("clama:customer-auth")?.slice(0, 80),
    })
    return loaded
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // No client: state já foi inicializado do storage no useState init.
    // Aqui só sinalizamos que terminamos a hidratação.
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (authState.user) {
      // eslint-disable-next-line no-console
      console.log("[CustomerAuth] save effect", { email: authState.user.email })
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
      // Sem refreshToken: pode ser auth nunca existiu OU state ainda não
      // hidratou do storage. NÃO limpamos storage aqui — clearAuthFromStorage()
      // chamado pré-hidratação apagaria tokens válidos esperando carregamento.
      // O save effect também não roda (authState.user é null), então noop é
      // seguro: se realmente não há auth, o estado já está coerente.
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

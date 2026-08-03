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
}

interface LoginResponse {
  access: string
  refresh: string
  user: CustomerUser
}

interface CustomerAuthContextValue {
  user: CustomerUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<CustomerUser>
  logout: () => Promise<void>
  /** Renova a sessão via cookie. `true` se renovou. */
  refreshAccessToken: () => Promise<boolean>
  setUser: (user: CustomerUser) => void
}

const CUSTOMER_AUTH_STORAGE_KEY = "clama:customer-auth"

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null)

const EMPTY_AUTH: CustomerAuthState = {
  user: null,
}

/**
 * Valida o formato do estado persistido no storage.
 * Rejeita JSONs parciais que poderiam fazer o app se comportar como
 * autenticado sem credenciais reais.
 */
function isValidAuthState(value: unknown): value is CustomerAuthState {
  if (!value || typeof value !== "object") return false
  const obj = value as Record<string, unknown>

  // ADR-01: os tokens vivem em cookie HttpOnly e nunca chegam ao JavaScript.
  // O storage guarda apenas o `user`, que é o que sustenta `isAuthenticated`
  // e os guards de rota — dado não sensível, e evita um /me a cada boot.
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
  localStorage.setItem(CUSTOMER_AUTH_STORAGE_KEY, JSON.stringify(state))
}

function clearAuthFromStorage(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(CUSTOMER_AUTH_STORAGE_KEY)
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  // Server renders EMPTY_AUTH (sem localStorage). Client inicializa
  // sincronamente do storage no useState init — state já está correto na
  // primeira renderização cliente. Consumidores que mostram UI auth-dependente
  // DEVEM gatear com isClient/isLoading pra evitar mismatch de hidratação.
  const [authState, setAuthState] = useState<CustomerAuthState>(() => {
    if (typeof window === "undefined") return EMPTY_AUTH
    return loadAuthFromStorage()
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // No client: state já foi inicializado do storage no useState init.
    // Aqui só sinalizamos que terminamos a hidratação.
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
    }
    setAuthState(newState)
    saveAuthToStorage(newState)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    // Sempre limpa localmente primeiro — UX idempotente.
    setAuthState(EMPTY_AUTH)
    clearAuthFromStorage()

    {
      try {
        await logoutRequest()
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
  }, [])

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (!authState.user) {
      // Sem `user`: ou a sessão nunca existiu, ou o state ainda não
      // hidratou do storage. NÃO limpamos storage aqui — clearAuthFromStorage()
      // chamado pré-hidratação apagaria tokens válidos esperando carregamento.
      // O save effect também não roda (authState.user é null), então noop é
      // seguro: se realmente não há auth, o estado já está coerente.
      return false
    }

    try {
      // ADR-01: o refresh vem do cookie; corpo vazio. A resposta reemite os
      // cookies — nada de token trafega pelo JavaScript.
      await apiFetch("/api/customer/auth/refresh/", {
        method: "POST",
        showToast: false,
      })
      return true
    } catch (err) {
      if (err instanceof PastoralApiError && err.httpStatus === 401) {
        setAuthState(EMPTY_AUTH)
        clearAuthFromStorage()
      }
      return false
    }
  }, [authState.user])

  const setUser = useCallback((user: CustomerUser) => {
    setAuthState((prev) => {
      const next = { ...prev, user }
      saveAuthToStorage(next)
      return next
    })
  }, [])

  const value: CustomerAuthContextValue = {
    user: authState.user,
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

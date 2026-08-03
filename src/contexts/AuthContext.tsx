import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { apiFetch, PastoralApiError } from "@/lib/api"

interface User {
  id: string
  email: string
  nome_completo: string
  is_clama_admin: boolean
}

interface AuthState {
  // ADR-01: os tokens vivem em cookie HttpOnly com escopo Path=/api e nunca
  // chegam ao JavaScript. O storage guarda só o `user`, que sustenta
  // `isAuthenticated` e os guards de rota.
  user: User | null
}

interface LoginResponse {
  user: User
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  /** Renova a sessão via cookie. `true` se renovou. */
  refreshAccessToken: () => Promise<boolean>
}

const AUTH_STORAGE_KEY = "clama:admin-auth"

const AuthContext = createContext<AuthContextValue | null>(null)

function loadAuthFromStorage(): AuthState {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      // Blob sem `user` válido não é sessão — descarta em vez de propagar
      // um estado meio-autenticado.
      if (parsed && typeof parsed === "object" && "user" in parsed) {
        const u = (parsed as { user: unknown }).user
        if (u && typeof u === "object" && "email" in u) {
          return { user: u as User }
        }
      }
    }
  } catch {
    // JSON inválido, limpa o storage
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
  return { user: null }
}

function saveAuthToStorage(state: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
}

function clearAuthFromStorage(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => loadAuthFromStorage())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initial load complete
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (authState.user) {
      saveAuthToStorage(authState)
    }
  }, [authState])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<LoginResponse>("/api/admin/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    const newState: AuthState = { user: data.user }
    setAuthState(newState)
    saveAuthToStorage(newState)
  }, [])

  const logout = useCallback(() => {
    setAuthState({ user: null })
    clearAuthFromStorage()
  }, [])

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (!authState.user) {
      logout()
      return false
    }

    try {
      // ADR-01: o refresh vem do cookie; corpo vazio. A resposta reemite os
      // cookies — nenhum token chega ao JavaScript.
      await apiFetch("/api/admin/auth/refresh/", { method: "POST" })
      return true
    } catch (err) {
      if (err instanceof PastoralApiError && err.httpStatus === 401) {
        logout()
      }
      return false
    }
  }, [authState.user, logout])

  const value: AuthContextValue = {
    user: authState.user,
    isAuthenticated: !!authState.user,
    isLoading,
    login,
    logout,
    refreshAccessToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

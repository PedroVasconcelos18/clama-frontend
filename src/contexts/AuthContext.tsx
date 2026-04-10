import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { apiFetch, PastoralApiError } from "@/lib/api"

interface User {
  id: string
  email: string
  nome_completo: string
  is_clama_admin: boolean
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
}

interface LoginResponse {
  access: string
  refresh: string
  user: User
}

interface RefreshResponse {
  access: string
}

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshAccessToken: () => Promise<string | null>
}

const AUTH_STORAGE_KEY = "clama:admin-auth"

const AuthContext = createContext<AuthContextValue | null>(null)

function loadAuthFromStorage(): AuthState {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Invalid JSON, clear storage
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
  return { user: null, accessToken: null, refreshToken: null }
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

    const newState: AuthState = {
      user: data.user,
      accessToken: data.access,
      refreshToken: data.refresh,
    }
    setAuthState(newState)
    saveAuthToStorage(newState)
  }, [])

  const logout = useCallback(() => {
    setAuthState({ user: null, accessToken: null, refreshToken: null })
    clearAuthFromStorage()
  }, [])

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!authState.refreshToken) {
      logout()
      return null
    }

    try {
      const data = await apiFetch<RefreshResponse>("/api/admin/auth/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh: authState.refreshToken }),
      })

      const newState: AuthState = {
        ...authState,
        accessToken: data.access,
      }
      setAuthState(newState)
      saveAuthToStorage(newState)
      return data.access
    } catch (err) {
      // Refresh failed, logout
      if (err instanceof PastoralApiError && err.httpStatus === 401) {
        logout()
      }
      return null
    }
  }, [authState, logout])

  const value: AuthContextValue = {
    user: authState.user,
    accessToken: authState.accessToken,
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

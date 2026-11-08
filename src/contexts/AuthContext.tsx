/**
 * Adaptador fino sobre `useSessao` para as telas de admin que ainda usam
 * `useAuth`. Task 8 elimina este arquivo.
 */
import { useMemo } from "react"
import { useSessao } from "@/contexts/SessaoContext"
import { PastoralApiError } from "@/lib/api"

interface User {
  id: string
  email: string
  nome_completo: string
  is_clama_admin: boolean
}

interface AuthContextValue {
  user: User | null
  /** Autenticado E admin: cliente logado não passa pelo guard de /admin. */
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export function useAuth(): AuthContextValue {
  const { usuario, carregando, login, logout } = useSessao()
  return useMemo(() => {
    const admin = usuario?.papel === "ADMIN" || usuario?.papel === "SUPERUSUARIO"
    return {
      user:
        usuario && admin
          ? {
              id: String(usuario.id),
              email: usuario.email,
              nome_completo: usuario.nomeCompleto,
              is_clama_admin: true,
            }
          : null,
      isAuthenticated: admin,
      isLoading: carregando,
      login: async (email, password) => {
        const u = await login(email, password)
        if (u.papel === "CLIENTE") {
          await logout()
          throw new PastoralApiError(
            "Sem acesso",
            "nao_admin",
            "Esse espaço é só para admins do Clama.",
            403
          )
        }
      },
      logout,
    }
  }, [usuario, carregando, login, logout])
}

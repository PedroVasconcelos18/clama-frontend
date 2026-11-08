/**
 * Adaptador fino sobre `useSessao` para as telas de cliente que ainda usam
 * `useCustomerAuth`. Task 8 elimina este arquivo.
 */
import { useMemo } from "react"
import { useSessao } from "@/contexts/SessaoContext"

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

interface CustomerAuthContextValue {
  user: CustomerUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<CustomerUser>
  logout: () => Promise<void>
  /** No-op: o usuário vem da sessão do servidor. */
  setUser: (user: CustomerUser) => void
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const { usuario, carregando, login, logout } = useSessao()
  return useMemo(() => {
    const paraCliente = (u: NonNullable<typeof usuario>): CustomerUser => ({
      id: u.id,
      email: u.email,
      nome_completo: u.nomeCompleto,
      force_change_password: false,
      freemium_used_at: null,
    })
    return {
      user: usuario ? paraCliente(usuario) : null,
      isAuthenticated: !!usuario,
      isLoading: carregando,
      login: async (email, password) => paraCliente(await login(email, password)),
      logout,
      setUser: () => {},
    }
  }, [usuario, carregando, login, logout])
}

/**
 * Sessão do usuário (cookie `SESSION` HttpOnly). Fonte da verdade é o
 * servidor: ao montar, `GET /api/auth/eu` — 401 significa só "anônimo".
 * Nada da sessão vai para o localStorage.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { apiFetch, PastoralApiError } from "@/lib/api"
import type { components } from "@/types/api-schema"

export type Papel = NonNullable<components["schemas"]["UsuarioResposta"]["papel"]>

export interface Usuario {
  id: number
  email: string
  nomeCompleto: string
  nomeFormatoBlog: string
  papel: Papel
}

interface SessaoValue {
  usuario: Usuario | null
  carregando: boolean
  login: (email: string, senha: string) => Promise<Usuario>
  /** Encerra a sessão no servidor e limpa o estado local, mesmo se a chamada falhar. */
  logout: () => Promise<void>
  /**
   * Chamado por `useApi` num 401: limpa o usuário. Devolve `true` só na
   * primeira vez desde o último login, para o redirecionamento acontecer uma vez.
   */
  expirar: () => boolean
}

const SessaoContext = createContext<SessaoValue | null>(null)

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const expirada = useRef(false)

  useEffect(() => {
    let ativo = true
    apiFetch<Usuario>("/api/auth/eu", { showToast: false })
      .then((u) => ativo && setUsuario(u))
      .catch((err) => {
        // 401 = anônimo. Outros erros (rede, 5xx) também deixam anônimo.
        if (!(err instanceof PastoralApiError)) throw err
      })
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  const login = useCallback(async (email: string, senha: string) => {
    const u = await apiFetch<Usuario>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
      showToast: false,
    })
    expirada.current = false
    setUsuario(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    setUsuario(null)
    try {
      await apiFetch("/api/auth/logout", { method: "POST", showToast: false })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[Sessao] logout no servidor falhou", err)
    }
  }, [])

  const expirar = useCallback(() => {
    if (expirada.current) return false
    expirada.current = true
    setUsuario(null)
    return true
  }, [])

  const value = useMemo(
    () => ({ usuario, carregando, login, logout, expirar }),
    [usuario, carregando, login, logout, expirar]
  )
  return <SessaoContext.Provider value={value}>{children}</SessaoContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSessao(): SessaoValue {
  const ctx = useContext(SessaoContext)
  if (!ctx) throw new Error("useSessao must be used within a SessaoProvider")
  return ctx
}

/**
 * Hook único para chamadas autenticadas por cookie de sessão (`fetchApi`).
 * Sem refresh: 401 = sessão perdida.
 * Num 401, limpa a sessão e leva ao login (`/admin/login` em rota `/admin`,
 * `/login` no resto) com o toast de sessão expirada — uma vez só por sessão,
 * mesmo com vários 401 simultâneos.
 */
import { useCallback, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useSessao } from "@/contexts/SessaoContext"
import { apiFetch, PastoralApiError } from "@/lib/api"
import { getSessionExpiredError } from "@/i18n"

interface FetchApiOptions extends RequestInit {
  /** Se false, não exibe toast de erro automaticamente. Default: true */
  showToast?: boolean
}

export function useApi() {
  const { expirar } = useSessao()
  const navigate = useNavigate()
  // Ref: a identidade de `fetchApi` não muda a cada navegação (páginas a usam
  // em deps de efeito).
  const { pathname } = useLocation()
  const pathnameRef = useRef(pathname)
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  const fetchApi = useCallback(
    async <T>(path: string, init?: FetchApiOptions): Promise<T> => {
      const { showToast = true, ...resto } = init ?? {}
      try {
        return await apiFetch<T>(path, { ...resto, showToast: false })
      } catch (err) {
        if (err instanceof PastoralApiError) {
          if (err.httpStatus === 401) {
            if (expirar()) {
              toast.error(getSessionExpiredError())
              navigate(pathnameRef.current.startsWith("/admin") ? "/admin/login" : "/login", {
                replace: true,
              })
            }
          } else if (showToast) {
            toast.error(err.pastoralMessage)
          }
        }
        throw err
      }
    },
    [expirar, navigate]
  )

  return { fetchApi }
}

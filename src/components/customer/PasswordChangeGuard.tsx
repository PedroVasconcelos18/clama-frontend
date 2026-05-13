import { Navigate, useLocation } from "react-router-dom"
import { useCustomerAuth } from "@/contexts/CustomerAuthContext"
import { validateNextPath } from "@/lib/redirects"

interface PasswordChangeGuardProps {
  children: React.ReactNode
}

/**
 * Se o usuário customer está logado com `force_change_password=true`,
 * redireciona pra `/trocar-senha?next=<currentPath>`. Caso contrário,
 * renderiza os filhos normalmente. Não bloqueia anônimos — combine com
 * `CustomerProtectedRoute` quando precisar.
 */
export function PasswordChangeGuard({ children }: PasswordChangeGuardProps) {
  const { user } = useCustomerAuth()
  const location = useLocation()

  if (user?.force_change_password === true && location.pathname !== "/trocar-senha") {
    const next = validateNextPath(`${location.pathname}${location.search}`)
    return (
      <Navigate
        to={`/trocar-senha?next=${encodeURIComponent(next)}`}
        replace
      />
    )
  }

  return <>{children}</>
}

export default PasswordChangeGuard

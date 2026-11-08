import { Navigate, useLocation } from "react-router-dom"
import { useSessao } from "@/contexts/SessaoContext"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { usuario, carregando: isLoading } = useSessao()
  const isAuthenticated = usuario?.papel === "ADMIN" || usuario?.papel === "SUPERUSUARIO"
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-clama-night flex items-center justify-center">
        <LoadingSpinner className="text-clama-gold" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Preserve the attempted URL for redirect after login
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
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

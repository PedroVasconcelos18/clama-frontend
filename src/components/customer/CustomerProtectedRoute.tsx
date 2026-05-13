import { Navigate, useLocation } from "react-router-dom"
import { useCustomerAuth } from "@/contexts/CustomerAuthContext"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { validateNextPath } from "@/lib/redirects"

interface CustomerProtectedRouteProps {
  children: React.ReactNode
}

export function CustomerProtectedRoute({ children }: CustomerProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useCustomerAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-clama-night flex items-center justify-center">
        <LoadingSpinner className="text-clama-gold" />
      </div>
    )
  }

  if (!isAuthenticated) {
    const next = validateNextPath(`${location.pathname}${location.search}`)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(next)}`}
        replace
      />
    )
  }

  return <>{children}</>
}

export default CustomerProtectedRoute

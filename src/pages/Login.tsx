import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { useCustomerAuth } from "@/contexts/CustomerAuthContext"
import { PastoralApiError } from "@/lib/api"
import { validateNextPath } from "@/lib/redirects"
import { loginSchema, type LoginFormData } from "@/lib/schemas/customer"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, isAuthenticated, user, isLoading } = useCustomerAuth()

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const next = validateNextPath(searchParams.get("next"))

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Redireciona se já autenticado e flag false
  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated && user) {
      if (user.force_change_password) {
        navigate(`/trocar-senha?next=${encodeURIComponent(next)}`, { replace: true })
      } else {
        navigate(next, { replace: true })
      }
    }
  }, [isAuthenticated, user, isLoading, navigate, next])

  async function onSubmit(data: LoginFormData) {
    setError(null)
    setIsSubmitting(true)

    try {
      const loggedUser = await login(data.email, data.password)

      if (loggedUser.force_change_password) {
        navigate(`/trocar-senha?next=${encodeURIComponent(next)}`, { replace: true })
      } else {
        navigate(next, { replace: true })
      }
    } catch (err) {
      let message = "Algo não saiu como o esperado. Tente novamente."
      if (err instanceof PastoralApiError) {
        message = err.pastoralMessage
      }
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-clama-night flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="font-serif text-clama-gold text-3xl tracking-wide">
              Clama
            </h1>
          </Link>
          <p className="text-clama-cream/60 text-sm mt-2">
            Entre para continuar sua oração
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <PastoralAlert variant="error" className="mb-4">
                {error}
              </PastoralAlert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-clama-cream/80">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="bg-clama-night border-clama-gold/30 text-clama-cream placeholder:text-clama-cream/40 focus:border-clama-gold"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-clama-cream/80">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                className="bg-clama-night border-clama-gold/30 text-clama-cream placeholder:text-clama-cream/40 focus:border-clama-gold"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-red-400 text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 mt-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size={16} className="mr-2" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-clama-cream/40 text-xs mt-6">
          Sua conta foi criada quando você recebeu sua primeira oração.
          <br />
          Use o e-mail que você cadastrou.
        </p>
      </div>
    </div>
  )
}

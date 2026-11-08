import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { useSessao } from "@/contexts/SessaoContext"
import { useApi } from "@/hooks/useApi"
import { PastoralApiError } from "@/lib/api"
import { goToNext, validateNextPath } from "@/lib/redirects"
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from "@/lib/schemas/customer"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"

export default function TrocarSenha() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { usuario, carregando } = useSessao()
  const { fetchApi } = useApi()

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const next = validateNextPath(searchParams.get("next"))

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  // Redireciona anônimos pra login com next=/trocar-senha
  useEffect(() => {
    if (carregando) return
    if (!usuario) {
      const fullPath = `/trocar-senha${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`
      navigate(`/login?next=${encodeURIComponent(fullPath)}`, { replace: true })
    }
  }, [usuario, carregando, navigate, searchParams])

  async function onSubmit(data: ChangePasswordFormData) {
    setError(null)
    setIsSubmitting(true)

    try {
      await fetchApi("/api/conta/senha", {
        method: "POST",
        body: JSON.stringify({
          senhaAtual: data.senha_atual,
          novaSenha: data.nova_senha,
        }),
        showToast: false,
      })

      toast.success("Senha trocada. Que sua oração siga em paz.")
      goToNext(navigate, next, { replace: true })
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
          <p className="text-clama-cream/60 text-sm mt-2">Trocar senha</p>
        </div>

        {/* Card */}
        <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-6">
          <p className="text-clama-cream/70 text-sm mb-4 leading-relaxed">
            Escolha uma senha nova, só sua. As outras sessões abertas com a senha
            antiga serão encerradas.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <PastoralAlert variant="error" className="mb-2">
                {error}
              </PastoralAlert>
            )}

            <div className="space-y-2">
              <Label htmlFor="senha_atual" className="text-clama-cream/80">
                Senha atual
              </Label>
              <Input
                id="senha_atual"
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha de hoje"
                className="bg-clama-night border-clama-gold/30 text-clama-cream placeholder:text-clama-cream/40 focus:border-clama-gold"
                {...register("senha_atual")}
              />
              {errors.senha_atual && (
                <p className="text-red-400 text-sm">
                  {errors.senha_atual.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova_senha" className="text-clama-cream/80">
                Nova senha
              </Label>
              <Input
                id="nova_senha"
                type="password"
                autoComplete="new-password"
                placeholder="Pelo menos 8 caracteres"
                className="bg-clama-night border-clama-gold/30 text-clama-cream placeholder:text-clama-cream/40 focus:border-clama-gold"
                {...register("nova_senha")}
              />
              {errors.nova_senha && (
                <p className="text-red-400 text-sm">
                  {errors.nova_senha.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar_senha" className="text-clama-cream/80">
                Confirmar nova senha
              </Label>
              <Input
                id="confirmar_senha"
                type="password"
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                className="bg-clama-night border-clama-gold/30 text-clama-cream placeholder:text-clama-cream/40 focus:border-clama-gold"
                {...register("confirmar_senha")}
              />
              {errors.confirmar_senha && (
                <p className="text-red-400 text-sm">
                  {errors.confirmar_senha.message}
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
                  Trocando...
                </>
              ) : (
                "Trocar senha"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-clama-cream/40 text-xs mt-6">
          Sua nova senha deve ter pelo menos 8 caracteres.
        </p>
      </div>
    </div>
  )
}

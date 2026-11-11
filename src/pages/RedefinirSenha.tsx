import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { useSessao } from "@/contexts/SessaoContext"
import { lerTokenETirarDaUrl } from "@/lib/tokenDaUrl"
import { apiFetch, PastoralApiError } from "@/lib/api"
import { redefinirSenhaSchema, type RedefinirSenhaFormData } from "@/lib/schemas/customer"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"

/**
 * Redefinir (`/redefinir-senha`) e definir (`/definir-senha`) senha: a mesma tela
 * e o mesmo endpoint, só o título muda.
 */
export default function RedefinirSenha({ modo = "redefinir" }: { modo?: "redefinir" | "definir" }) {
  const navigate = useNavigate()
  const { carregando } = useSessao()
  const [token] = useState(lerTokenETirarDaUrl)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const titulo = modo === "definir" ? "Definir senha" : "Redefinir senha"

  // O link do e-mail leva o token na URL: o navegador não pode repassá-lo por Referer.
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "referrer"
    meta.content = "no-referrer"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RedefinirSenhaFormData>({ resolver: zodResolver(redefinirSenhaSchema) })

  async function onSubmit(data: RedefinirSenhaFormData) {
    setError(null)
    setIsSubmitting(true)
    try {
      await apiFetch("/api/auth/redefinicao-de-senha", {
        method: "POST",
        body: JSON.stringify({ token, novaSenha: data.nova_senha }),
        showToast: false,
      })
      toast.success("Senha definida. Agora é só entrar.")
      navigate("/login", { replace: true })
    } catch (err) {
      setError(
        err instanceof PastoralApiError
          ? err.pastoralMessage
          : "Algo não saiu como o esperado. Tente novamente.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-clama-night flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="font-serif text-clama-gold text-3xl tracking-wide">Clama</h1>
          </Link>
          <p className="text-clama-cream/60 text-sm mt-2">{titulo}</p>
        </div>

        <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <PastoralAlert variant="error">{error}</PastoralAlert>}
            {!token && !error && (
              <PastoralAlert variant="error">
                Este link está incompleto. Peça um novo em &quot;Esqueci minha senha&quot;.
              </PastoralAlert>
            )}

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
              {errors.nova_senha && <p className="text-red-400 text-sm">{errors.nova_senha.message}</p>}
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
                <p className="text-red-400 text-sm">{errors.confirmar_senha.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting || carregando || !token} className="w-full h-10 mt-2">
              {isSubmitting ? (
                <>
                  <LoadingSpinner size={16} className="mr-2" />
                  Salvando...
                </>
              ) : (
                titulo
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

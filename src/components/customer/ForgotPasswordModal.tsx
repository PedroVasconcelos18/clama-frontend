import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { forgotPassword } from "@/lib/api/customer"
import { PastoralApiError } from "@/lib/api"
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/lib/schemas/customer"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pré-preenche o campo com o e-mail já digitado na tela de login. */
  defaultEmail?: string
}

/**
 * Conteúdo interno do modal. Montado **somente quando o modal está aberto**
 * (o pai não renderiza isto enquanto `open` é false). Isso faz cada
 * abertura começar com estado limpo via inicializadores de `useState` /
 * `defaultValues` do form — sem `useEffect` de reset (e sem o erro
 * `react-hooks/set-state-in-effect`).
 */
function ForgotPasswordForm({
  defaultEmail,
  onClose,
}: {
  defaultEmail: string
  onClose: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: defaultEmail },
  })

  async function onSubmit(data: ForgotPasswordFormData) {
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await forgotPassword(data.email)
      setSuccessMessage(
        res.detail ??
          "Se este e-mail estiver cadastrado, você receberá uma senha temporária em instantes.",
      )
    } catch (err) {
      let message = "Algo não saiu como o esperado. Tente novamente."
      if (err instanceof PastoralApiError) {
        message = err.pastoralMessage
      }
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successMessage) {
    return (
      <div className="space-y-4">
        <PastoralAlert variant="success">{successMessage}</PastoralAlert>
        <Button type="button" className="w-full h-10" onClick={onClose}>
          Entendi
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}

      <div className="space-y-2">
        <Label htmlFor="forgot-email" className="text-clama-cream/80">
          E-mail
        </Label>
        <Input
          id="forgot-email"
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

      <Button type="submit" disabled={isSubmitting} className="w-full h-10">
        {isSubmitting ? (
          <>
            <LoadingSpinner size={16} className="mr-2" />
            Enviando...
          </>
        ) : (
          "Enviar senha temporária"
        )}
      </Button>
    </form>
  )
}

/**
 * Modal de recuperação de senha aberto a partir da tela `/login`.
 *
 * Fluxo: usuário informa o e-mail → backend (sempre 200 genérico,
 * anti-enumeração) gera uma senha temporária e envia por e-mail. Ao logar
 * com ela, `force_change_password=true` força a troca em `/trocar-senha`.
 *
 * Mostra um estado de sucesso (em vez de fechar direto) para o usuário
 * saber que deve checar o e-mail — incluindo a caixa de spam. A mensagem é
 * a `detail` que o backend retorna (já pastoral e genérica).
 */
export function ForgotPasswordModal({
  open,
  onOpenChange,
  defaultEmail = "",
}: ForgotPasswordModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-clama-night-deep border border-clama-gold/20">
        <DialogHeader>
          <DialogTitle className="text-clama-gold font-serif">
            Recuperar acesso
          </DialogTitle>
          <DialogDescription className="text-clama-cream/70">
            Informe o e-mail da sua conta. Se ele estiver cadastrado,
            enviaremos uma senha temporária — você troca por uma sua no
            primeiro acesso.
          </DialogDescription>
        </DialogHeader>

        {/* Só montamos o form quando aberto: cada abertura começa limpa. */}
        {open && (
          <ForgotPasswordForm
            defaultEmail={defaultEmail}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ForgotPasswordModal

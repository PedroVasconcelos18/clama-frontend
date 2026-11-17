import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { useSessao, type Usuario } from "@/contexts/SessaoContext"
import { PastoralApiError } from "@/lib/api"
import { cadastrar } from "@/lib/api/cadastro"
import {
  Turnstile,
  getTurnstileSiteKey,
  type TurnstileInstance,
} from "@/lib/captcha/turnstile"
import { cn } from "@/lib/utils"
import { goToNext, validateNextPath } from "@/lib/redirects"
import { loginSchema, type LoginFormData } from "@/lib/schemas/customer"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { ForgotPasswordModal } from "@/components/customer/ForgotPasswordModal"

interface LoginLocationState {
  /** Mensagem one-shot vinda de outra página (ex.: gate conta_existente da LP). */
  flashMessage?: string
  /** Override de `next` quando o redirect veio de `location.state` (ex.: LP /). */
  next?: string
}

const MSG_GENERICA = "Algo não saiu como o esperado. Tente novamente."

/** Aba "Criar conta": sem senha. A API manda o link de ativação por e-mail e responde igual para qualquer e-mail. */
function CriarConta() {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const turnstile = useRef<TurnstileInstance>(null)

  // DEV: o widget invisível às vezes não emite o token em ambiente local; a API em dev aceita qualquer token não vazio.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const t = setTimeout(
      () => setToken((atual) => atual || "dev-fallback-token"),
      1500,
    )
    return () => clearTimeout(t)
  }, [])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!nome.trim()) return setErro("Diga como podemos te chamar.")
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return setErro("Confira seu e-mail — parece que faltou algo.")
    setEnviando(true)
    try {
      setMensagem(await cadastrar(nome.trim(), email.trim(), token))
    } catch (err) {
      setErro(
        err instanceof PastoralApiError ? err.pastoralMessage : MSG_GENERICA,
      )
      setToken("") // o token do Turnstile é de uso único
      turnstile.current?.reset()
    } finally {
      setEnviando(false)
    }
  }

  if (mensagem) return <PastoralAlert variant="info">{mensagem}</PastoralAlert>

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
      <div className="space-y-2">
        <Label htmlFor="cadastro-nome" className="text-clama-cream/80">
          Como podemos te chamar?
        </Label>
        <Input
          id="cadastro-nome"
          autoComplete="given-name"
          maxLength={120}
          placeholder="Seu primeiro nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="bg-clama-night border-clama-gold/30 text-clama-cream placeholder:text-clama-cream/40 focus:border-clama-gold"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cadastro-email" className="text-clama-cream/80">
          E-mail
        </Label>
        <Input
          id="cadastro-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-clama-night border-clama-gold/30 text-clama-cream placeholder:text-clama-cream/40 focus:border-clama-gold"
        />
      </div>
      <p className="text-clama-cream/50 text-xs">
        Você vai criar a senha pelo link que enviaremos para o seu e-mail.
      </p>
      <Turnstile
        ref={turnstile}
        siteKey={getTurnstileSiteKey()}
        onSuccess={setToken}
        onExpire={() => setToken("")}
        onError={() => setToken("")}
        options={{ size: "invisible" }}
      />
      <Button
        type="submit"
        disabled={enviando || !token}
        className="w-full h-10 mt-2"
      >
        {enviando ? (
          <>
            <LoadingSpinner size={16} className="mr-2" />
            Enviando...
          </>
        ) : (
          "Criar minha conta"
        )}
      </Button>
    </form>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login, usuario, carregando } = useSessao()

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [aba, setAba] = useState<"entrar" | "criar">("entrar")

  // Flash message vinda de outro componente (ex.: LP redirecionando após
  // 409 conta_existente). Lemos UMA VEZ na montagem e limpamos o
  // state pra não persistir em refreshes / navegações posteriores.
  const locationState = (location.state as LoginLocationState | null) ?? null
  const [flashMessage] = useState<string | null>(
    locationState?.flashMessage ?? null,
  )
  useEffect(() => {
    if (locationState?.flashMessage) {
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      })
    }
    // Intencionalmente vazio: roda só uma vez na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // `next` pode vir de querystring OU de location.state (preferindo state).
  // Default `/conta` — após login o usuário cai na área dele (histórico
  // de pedidos + CTA novo pedido). Páginas que precisam de auth no meio
  // do fluxo (LP redirect por gate conta_existente) sobrescrevem
  // via `state.next` ou query `?next=`.
  const next = validateNextPath(
    locationState?.next ?? searchParams.get("next"),
    "/conta",
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const emailValue = watch("email")

  // Admin vai para o painel; cliente, para o destino pedido.
  const seguir = useCallback(
    (u: Usuario) => {
      if (u.papel === "ADMIN" || u.papel === "SUPERUSUARIO") {
        navigate("/admin", { replace: true })
      } else {
        goToNext(navigate, next, { replace: true })
      }
    },
    [navigate, next],
  )

  // Já autenticado: não mostra o formulário.
  useEffect(() => {
    if (!carregando && usuario) seguir(usuario)
  }, [carregando, usuario, seguir])

  async function onSubmit(data: LoginFormData) {
    setError(null)
    setIsSubmitting(true)

    try {
      await login(data.email, data.password) // o efeito acima leva para o destino
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
          <p className="text-clama-cream/60 text-sm mt-2">Sua conta no Clama</p>
        </div>

        {/* Flash message (one-shot) — vem de outra página via location.state. */}
        {flashMessage && !error && (
          <PastoralAlert variant="info" className="mb-4">
            {flashMessage}
          </PastoralAlert>
        )}

        {/* Login Card */}
        <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-6">
          <div
            role="tablist"
            aria-label="Acesso"
            className="mb-5 flex border-b border-clama-gold/15"
          >
            {(
              [
                ["entrar", "Já tenho conta"],
                ["criar", "Criar conta"],
              ] as const
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={aba === id}
                onClick={() => setAba(id)}
                className={cn(
                  "-mb-px flex-1 border-b-2 px-2 py-2 text-sm font-semibold transition-colors",
                  aba === id
                    ? "border-clama-gold text-clama-gold"
                    : "border-transparent text-clama-cream/55 hover:text-clama-cream",
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>
          {aba === "criar" ? (
            <CriarConta />
          ) : (
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

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className={
                    flashMessage
                      ? "text-clama-night bg-clama-gold hover:opacity-90 text-sm font-semibold rounded-full px-4 py-1.5 transition-opacity"
                      : "text-clama-gold/80 hover:text-clama-gold text-sm underline underline-offset-4 transition-colors"
                  }
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || carregando}
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
          )}
        </div>

        <ul className="mt-6 space-y-2 text-clama-cream/70 text-sm">
          <li>Acompanhe seus clamores e releia as orações que recebeu</li>
          <li>Guarde suas orações em um só lugar</li>
        </ul>
        <p className="text-center text-clama-cream/40 text-xs mt-6">
          Para fazer um clamor e receber a oração, você não precisa de conta.
          <br />
          Usamos seus dados só para entregar suas orações e cuidar da sua conta.
        </p>
      </div>

      <ForgotPasswordModal
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        defaultEmail={emailValue ?? ""}
      />
    </div>
  )
}

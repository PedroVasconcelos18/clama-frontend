import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { useCustomerApi } from "@/hooks/useCustomerApi"
import { useCustomerAuth } from "@/contexts/CustomerAuthContext"
import { microcopy } from "@/i18n/microcopy"
import { cn } from "@/lib/utils"
import { inicial } from "@/lib/blog/presentation"
import type { Comentario } from "@/types/blog.types"

const MIN_LENGTH = 3
const MAX_LENGTH = 2000

export type CommentFormProps = {
  postSlug: string
  onCommentCreated?: (comment: Comentario) => void
}

const CARD =
  "rounded-2xl border border-clama-gold/15 bg-clama-night-deep p-6"

export function CommentForm({ postSlug, onCommentCreated }: CommentFormProps) {
  const { user, isAuthenticated, isLoading } = useCustomerAuth()
  const { customerFetch } = useCustomerApi()
  const [conteudo, setConteudo] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Mount-flag pra evitar hydration mismatch: server e primeira render cliente
  // renderizam um placeholder neutro; só após mount decidimos auth UI.
  const [mounted, setMounted] = useState(false)
  const [nextPath, setNextPath] = useState("/")
  useEffect(() => {
    setMounted(true)
    setNextPath(window.location.pathname)
  }, [])

  if (!mounted) {
    return (
      <div
        data-slot="comment-form-skeleton"
        className={cn(CARD, "text-sm text-clama-cream/50 opacity-60")}
        aria-hidden
      >
        {microcopy.commentForm.placeholder}
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div
        data-slot="comment-form-prompt"
        className={cn(
          CARD,
          "flex flex-col items-center gap-3 text-center",
          isLoading && "opacity-60",
        )}
      >
        <h3 className="font-serif text-xl text-clama-cream">
          Quer deixar uma palavra?
        </h3>
        <p className="max-w-md text-[0.88rem] leading-relaxed text-clama-cream/55">
          Entre na sua conta pra comentar — leva 30 segundos e seu nome aparece
          junto.
        </p>
        <a
          href={isLoading ? "#" : `/login?next=${encodeURIComponent(nextPath)}`}
          aria-disabled={isLoading || undefined}
          onClick={isLoading ? (e) => e.preventDefault() : undefined}
          className="mt-1 inline-flex items-center gap-2 rounded-full bg-clama-gold px-5 py-2.5 text-sm font-semibold text-clama-night transition-colors hover:bg-clama-gold-soft"
        >
          Entrar pra comentar →
        </a>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = conteudo.trim()
    if (trimmed.length < MIN_LENGTH) {
      setError(microcopy.validation.commentMuitoCurto)
      return
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(microcopy.validation.commentMuitoLongo)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const created = await customerFetch<Comentario>(
        `/api/blog/posts/${encodeURIComponent(postSlug)}/comments/`,
        {
          method: "POST",
          body: JSON.stringify({ conteudo: trimmed }),
        },
      )
      toast.success(microcopy.toasts.commentSent)
      setConteudo("")
      onCommentCreated?.(created)
    } finally {
      setSubmitting(false)
    }
  }

  const nome = user?.nome_completo ?? "você"

  return (
    <form data-slot="comment-form" onSubmit={handleSubmit} className={CARD}>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-clama-night-soft to-clama-gold/70 text-sm font-semibold text-clama-cream"
        >
          {inicial(nome)}
        </span>
        <label htmlFor="comment-content" className="text-sm text-clama-cream/70">
          Comentando como{" "}
          <span className="font-medium text-clama-cream">{nome}</span>
        </label>
      </div>

      <Textarea
        id="comment-content"
        rows={4}
        placeholder={microcopy.commentForm.placeholder}
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        disabled={submitting}
        aria-invalid={error ? true : undefined}
        aria-describedby="comment-helper"
        className="mt-4 resize-none border-clama-gold/20 bg-clama-night text-clama-cream placeholder:text-clama-cream/35 focus-visible:border-clama-gold/50"
      />

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex items-center justify-between gap-4">
        <p
          id="comment-helper"
          className="text-[0.72rem] leading-snug text-clama-cream/45"
        >
          {microcopy.commentForm.helperDataSensiveis}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[0.72rem] tabular-nums text-clama-cream/45">
            {conteudo.length} / {MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-clama-gold px-5 py-2 text-sm font-semibold text-clama-night transition-colors hover:bg-clama-gold-soft disabled:opacity-60"
          >
            {submitting
              ? microcopy.commentForm.submitting
              : microcopy.commentForm.submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCustomerApi } from "@/hooks/useCustomerApi"
import { useCustomerAuth } from "@/contexts/CustomerAuthContext"
import { microcopy } from "@/i18n/microcopy"
import type { Comentario } from "@/types/blog.types"

const MIN_LENGTH = 3
const MAX_LENGTH = 2000

export type CommentFormProps = {
  postSlug: string
  onCommentCreated?: (comment: Comentario) => void
}

export function CommentForm({ postSlug, onCommentCreated }: CommentFormProps) {
  const { user, isAuthenticated } = useCustomerAuth()
  const { customerFetch } = useCustomerApi()
  const [conteudo, setConteudo] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthenticated) {
    const nextPath =
      typeof window !== "undefined" ? window.location.pathname : "/"
    return (
      <div
        data-slot="comment-form-prompt"
        className="rounded-md border border-clama-blog-border-soft bg-clama-blog-comment-bg p-4 text-sm text-clama-blog-purple-prose"
      >
        {microcopy.commentForm.promptLoginInicio}
        <a
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className="font-medium text-clama-blog-gold-deep underline"
        >
          {microcopy.commentForm.promptLoginLinkText}
        </a>
        {microcopy.commentForm.promptLoginFim}
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
        `/api/blog/posts/${encodeURIComponent(postSlug)}/comentarios/`,
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

  return (
    <form
      data-slot="comment-form"
      onSubmit={handleSubmit}
      className="rounded-md border border-clama-blog-border-soft bg-clama-blog-comment-bg p-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="comment-content" className="text-clama-blog-purple-prose">
          Comentando como{" "}
          <span className="font-medium">{user?.nome_completo ?? "você"}</span>
        </Label>
        <Textarea
          id="comment-content"
          rows={3}
          placeholder={microcopy.commentForm.placeholder}
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          disabled={submitting}
          aria-invalid={error ? true : undefined}
          aria-describedby="comment-helper"
        />
        <p
          id="comment-helper"
          className="text-xs text-clama-blog-purple-prose/60"
        >
          {microcopy.commentForm.helperDataSensiveis}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between">
          <span className="text-xs text-clama-blog-purple-prose/60">
            {conteudo.length}/{MAX_LENGTH}
          </span>
          <Button type="submit" disabled={submitting}>
            {submitting
              ? microcopy.commentForm.submitting
              : microcopy.commentForm.submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}

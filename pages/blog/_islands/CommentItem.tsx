import { useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { tempoRelativo } from "@/lib/datetime"
import { microcopy } from "@/i18n/microcopy"
import { useCustomerApi } from "@/hooks/useCustomerApi"
import { inicial } from "@/lib/blog/presentation"
import type { Comentario } from "@/types/blog.types"

const EDIT_WINDOW_MS = 15 * 60 * 1000

export type CommentItemProps = {
  comment: Comentario
  isOwn?: boolean
  canModerate?: boolean
  isAdmin?: boolean
  onUpdated?: (next: Comentario) => void
  onDeleted?: (id: string) => void
}

export function CommentItem({
  comment,
  isOwn = false,
  canModerate = false,
  isAdmin = false,
  onUpdated,
  onDeleted,
}: CommentItemProps) {
  const { customerFetch } = useCustomerApi()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.conteudo)
  const [submitting, setSubmitting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const createdMs = new Date(comment.created_at).getTime()
  const canEdit = isOwn && Date.now() - createdMs < EDIT_WINDOW_MS
  const canDelete = isOwn || canModerate

  async function saveEdit() {
    if (draft.trim().length < 3) {
      toast.error(microcopy.validation.commentMuitoCurto)
      return
    }
    setSubmitting(true)
    try {
      const updated = await customerFetch<Comentario>(
        `/api/blog/comments/${comment.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ conteudo: draft.trim() }),
        },
      )
      setEditing(false)
      onUpdated?.(updated)
      toast.success(microcopy.toasts.commentEdited)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setSubmitting(true)
    try {
      await customerFetch(`/api/blog/comments/${comment.id}/`, {
        method: "DELETE",
      })
      onDeleted?.(comment.id)
      toast.success(microcopy.toasts.commentDeleted)
    } finally {
      setSubmitting(false)
      setMenuOpen(false)
    }
  }

  return (
    <article
      data-slot="comment-item"
      data-comment-id={comment.id}
      className={cn(
        "flex gap-3 border-b border-clama-gold/10 py-5 last:border-b-0",
        "motion-safe:animate-fade-in-comment",
      )}
    >
      <span
        aria-hidden
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clama-night-soft to-clama-gold/70 text-sm font-semibold text-clama-cream"
      >
        {inicial(comment.customer_nome)}
      </span>

      <div className="min-w-0 flex-1">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[0.9rem] font-semibold text-clama-cream">
              {comment.customer_nome}
            </span>
            {isAdmin && (
              <span className="rounded-full bg-clama-gold/15 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-clama-gold">
                Admin
              </span>
            )}
            <time
              dateTime={comment.created_at}
              className="text-[0.74rem] text-clama-cream/45"
            >
              · {tempoRelativo(comment.created_at)}
            </time>
          </div>

          {(canEdit || canDelete) && !editing && (
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="Ações do comentário"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-md p-1 text-clama-cream/40 transition-colors hover:bg-clama-night-soft hover:text-clama-cream"
              >
                <MoreHorizontal aria-hidden className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-10 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-clama-gold/20 bg-clama-night-deep py-1 shadow-xl"
                >
                  {canEdit && (
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm text-clama-cream hover:bg-clama-night-soft"
                      onClick={() => {
                        setMenuOpen(false)
                        setEditing(true)
                      }}
                    >
                      Editar
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={submitting}
                      className="block w-full px-3 py-2 text-left text-sm text-destructive hover:bg-clama-night-soft"
                      onClick={handleDelete}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        {editing ? (
          <div className="mt-3 flex flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              disabled={submitting}
              className="resize-none border-clama-gold/20 bg-clama-night text-clama-cream focus-visible:border-clama-gold/50"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setDraft(comment.conteudo)
                }}
                disabled={submitting}
                className="rounded-full border border-clama-gold/30 px-4 py-1.5 text-sm text-clama-cream/80 transition-colors hover:bg-clama-night-soft disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={submitting}
                className="rounded-full bg-clama-gold px-4 py-1.5 text-sm font-semibold text-clama-night transition-colors hover:bg-clama-gold-soft disabled:opacity-60"
              >
                {submitting ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 whitespace-pre-line text-[0.92rem] leading-relaxed text-clama-cream/85">
            {comment.conteudo}
          </p>
        )}
      </div>
    </article>
  )
}

import { useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { tempoRelativo } from "@/lib/datetime"
import { microcopy } from "@/i18n/microcopy"
import { useCustomerApi } from "@/hooks/useCustomerApi"
import type { Comentario } from "@/types/blog.types"

const EDIT_WINDOW_MS = 15 * 60 * 1000

function inicial(nome: string): string {
  const c = nome.trim().charAt(0)
  return c ? c.toUpperCase() : "?"
}

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
        `/api/blog/comentarios/${comment.id}/`,
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
      await customerFetch(`/api/blog/comentarios/${comment.id}/`, {
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
        "rounded-md border border-clama-blog-border-soft bg-clama-blog-comment-bg p-4",
        "motion-safe:animate-fade-in-comment",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clama-night-soft to-clama-blog-gold-deep text-sm font-medium text-clama-cream"
          >
            {inicial(comment.customer_nome)}
          </span>
          <div className="flex flex-col">
            <span className="flex items-center gap-2 text-sm font-medium text-clama-blog-purple-prose">
              {comment.customer_nome}
              {isAdmin && (
                <span className="rounded-full bg-clama-blog-gold-soft/30 px-2 py-0.5 text-xs text-clama-blog-purple-prose">
                  Admin
                </span>
              )}
            </span>
            <time
              dateTime={comment.created_at}
              className="text-xs text-clama-blog-purple-prose/60"
            >
              {tempoRelativo(comment.created_at)}
            </time>
          </div>
        </div>
        {(canEdit || canDelete) && !editing && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Ações do comentário"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal aria-hidden />
            </Button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-1 min-w-[140px] rounded-md border border-clama-blog-border-soft bg-white py-1 shadow-md"
              >
                {canEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-clama-blog-cream-warm"
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
                    className="block w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-clama-blog-cream-warm"
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
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false)
                setDraft(comment.conteudo)
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={saveEdit} disabled={submitting}>
              {submitting ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-line text-clama-night">
          {comment.conteudo}
        </p>
      )}
    </article>
  )
}

import { useState } from "react"
import { microcopy } from "@/i18n/microcopy"
import { usePostComments } from "@/hooks/usePostComments"
import { useCustomerAuth } from "@/contexts/CustomerAuthContext"
import type { Comentario } from "@/types/blog.types"
import { CommentItem } from "./CommentItem"

const POLLING_PAUSE_THRESHOLD = 3

export type CommentListProps = {
  postSlug: string
  initialComments?: Comentario[]
  initialCount?: number
  adminCustomerIds?: number[]
}

export function CommentList({
  postSlug,
  initialComments = [],
  initialCount = initialComments.length,
  adminCustomerIds = [],
}: CommentListProps) {
  const { user } = useCustomerAuth()
  const { comments, count, errorStreak, isPaused } = usePostComments(postSlug, {
    initialComments,
    initialCount,
  })
  const [localOverrides, setLocalOverrides] = useState<Map<string, Comentario>>(
    new Map(),
  )
  const [deleted, setDeleted] = useState<Set<string>>(new Set())

  const adminSet = new Set(adminCustomerIds)
  const showPaused = isPaused || errorStreak >= POLLING_PAUSE_THRESHOLD

  const renderedComments = comments
    .filter((c) => !deleted.has(c.id))
    .map((c) => localOverrides.get(c.id) ?? c)

  function handleUpdated(next: Comentario) {
    setLocalOverrides((prev) => {
      const map = new Map(prev)
      map.set(next.id, next)
      return map
    })
  }

  function handleDeleted(id: string) {
    setDeleted((prev) => {
      const set = new Set(prev)
      set.add(id)
      return set
    })
  }

  return (
    <section
      aria-label="Comentários"
      aria-live="polite"
      data-slot="comment-list"
      className="mt-8"
    >
      <header className="flex items-center justify-between border-b border-clama-gold/10 pb-4">
        <h2 className="font-serif text-2xl text-clama-cream">
          {microcopy.comments.heading(count)}
        </h2>
        {showPaused ? (
          <span className="text-[0.72rem] uppercase tracking-[0.16em] text-clama-cream/45">
            {microcopy.comments.paused}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-clama-gold-soft">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clama-gold/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-clama-gold" />
            </span>
            ao vivo
          </span>
        )}
      </header>

      {renderedComments.length === 0 ? (
        <p className="py-10 text-center text-[0.9rem] text-clama-cream/45">
          {microcopy.comments.emptyState}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {renderedComments.map((c) => (
            <li key={c.id}>
              <CommentItem
                comment={c}
                isOwn={user?.id === c.customer}
                canModerate={false}
                isAdmin={adminSet.has(c.customer)}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

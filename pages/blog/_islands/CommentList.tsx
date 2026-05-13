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
  adminCustomerIds?: string[]
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
    >
      <header className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-clama-blog-purple-prose">
          {microcopy.comments.heading(count)}
        </h2>
        {showPaused && (
          <span className="text-xs text-clama-blog-purple-prose/60">
            {microcopy.comments.paused}
          </span>
        )}
      </header>

      {renderedComments.length === 0 ? (
        <p className="mt-4 text-clama-blog-purple-prose/70">
          {microcopy.comments.emptyState}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
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

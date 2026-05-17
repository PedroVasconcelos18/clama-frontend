import { useCallback, useEffect, useState } from "react"
import { usePolling } from "./usePolling"
import type { Comentario, PaginatedComentarios } from "@/types/blog.types"

const API_URL = import.meta.env.VITE_API_URL ?? ""

export type UsePostCommentsOptions = {
  /** Polling habilitado (default true). */
  polling?: boolean
  /** Intervalo de polling em ms (default 30000). */
  intervalMs?: number
  /** Lista inicial (vinda de SSG/SSR). */
  initialComments?: Comentario[]
  /** Total inicial. */
  initialCount?: number
}

export type UsePostCommentsResult = {
  comments: Comentario[]
  count: number
  isPaused: boolean
  errorStreak: number
  refetch: () => void
}

async function fetchComments(slug: string): Promise<PaginatedComentarios> {
  const response = await fetch(
    `${API_URL}/api/blog/posts/${encodeURIComponent(slug)}/comments/`,
    { headers: { Accept: "application/json" } },
  )
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return (await response.json()) as PaginatedComentarios
}

/**
 * Hook que retorna a lista de comentários de um post, com polling de 30s por
 * default. GET é público — não exige auth.
 */
export function usePostComments(
  slug: string,
  options: UsePostCommentsOptions = {},
): UsePostCommentsResult {
  const {
    polling = true,
    intervalMs = 30000,
    initialComments = [],
    initialCount = initialComments.length,
  } = options

  const [comments, setComments] = useState<Comentario[]>(initialComments)
  const [count, setCount] = useState(initialCount)

  const fetcher = useCallback(() => fetchComments(slug), [slug])

  const polled = usePolling<PaginatedComentarios>(fetcher, {
    intervalMs,
    enabled: polling,
  })

  useEffect(() => {
    if (polled.data) {
      setComments(polled.data.results)
      setCount(polled.data.count)
    }
  }, [polled.data])

  return {
    comments,
    count,
    isPaused: polled.isPaused,
    errorStreak: polled.errorStreak,
    refetch: polled.refetch,
  }
}


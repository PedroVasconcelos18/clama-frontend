import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { useCustomerApi } from "./useCustomerApi"
import { microcopy } from "@/i18n/microcopy"
import type { LikeToggleResponse } from "@/types/blog.types"

export type UsePostLikeArgs = {
  slug: string
  initialLiked?: boolean
  initialCount?: number
}

export type UsePostLikeResult = {
  liked: boolean
  count: number
  toggle: () => Promise<void>
  pending: boolean
}

const DEBOUNCE_MS = 500

export function usePostLike({
  slug,
  initialLiked = false,
  initialCount = 0,
}: UsePostLikeArgs): UsePostLikeResult {
  const { customerFetch } = useCustomerApi()
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const lastClickRef = useRef<number>(0)

  const toggle = useCallback(async () => {
    const now = Date.now()
    if (now - lastClickRef.current < DEBOUNCE_MS) return
    lastClickRef.current = now

    // Otimista: atualiza UI antes do request
    const prevLiked = liked
    const prevCount = count
    const nextLiked = !prevLiked
    setLiked(nextLiked)
    setCount(nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1))
    setPending(true)

    try {
      const response = await customerFetch<LikeToggleResponse>(
        `/api/blog/posts/${encodeURIComponent(slug)}/like/`,
        { method: "POST", showToast: false },
      )
      // Reconcilia com o servidor (count autoritativo)
      setLiked(response.liked)
      setCount(response.like_count)
    } catch (err) {
      // Rollback otimista
      setLiked(prevLiked)
      setCount(prevCount)
      toast.error(microcopy.errors.generico)
      throw err
    } finally {
      setPending(false)
    }
  }, [slug, liked, count, customerFetch])

  return { liked, count, toggle, pending }
}

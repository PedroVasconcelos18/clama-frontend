import { useEffect, useState } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { microcopy } from "@/i18n/microcopy"
import { usePostLike } from "@/hooks/usePostLike"
import { useCustomerAuth } from "@/contexts/CustomerAuthContext"

export type LikeButtonProps = {
  postSlug: string
  initialLiked?: boolean
  initialCount?: number
  className?: string
}

const PILL =
  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold/60"

export function LikeButton({
  postSlug,
  initialLiked = false,
  initialCount = 0,
  className,
}: LikeButtonProps) {
  const { isAuthenticated, isLoading } = useCustomerAuth()
  const { liked, count, toggle, pending } = usePostLike({
    slug: postSlug,
    initialLiked,
    initialCount,
  })
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
      <span
        data-slot="like-button-skeleton"
        className={cn(
          PILL,
          "border-clama-gold/20 bg-clama-night-deep text-clama-cream opacity-60",
          className,
        )}
      >
        <Heart aria-hidden className="h-4 w-4" />
        <span>{initialCount}</span>
      </span>
    )
  }

  if (!isAuthenticated) {
    return (
      <a
        href={isLoading ? "#" : `/login?next=${encodeURIComponent(nextPath)}`}
        aria-disabled={isLoading || undefined}
        onClick={isLoading ? (e) => e.preventDefault() : undefined}
        data-slot="like-button-prompt"
        className={cn(
          PILL,
          "border-clama-gold/20 bg-clama-night-deep text-clama-cream/80 hover:border-clama-gold/40 hover:text-clama-cream",
          isLoading && "opacity-60",
          className,
        )}
      >
        <Heart aria-hidden className="h-4 w-4" />
        <span>{count}</span>
        <span className="text-clama-cream/55">· faça login pra curtir</span>
      </a>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? "Remover curtida" : "Curtir post"}
      disabled={pending}
      onClick={toggle}
      data-slot="like-button"
      data-liked={liked ? "true" : "false"}
      className={cn(
        PILL,
        "disabled:opacity-60",
        liked
          ? "border-clama-gold/60 bg-clama-gold/10 text-clama-gold"
          : "border-clama-gold/20 bg-clama-night-deep text-clama-cream/80 hover:border-clama-gold/40 hover:text-clama-cream",
        className,
      )}
    >
      <Heart
        aria-hidden
        className={cn("h-4 w-4", liked && "fill-clama-gold")}
      />
      <span aria-label={microcopy.likes.countLabel(count)}>{count}</span>
      <span>{liked ? "Curtido" : "Curtir"}</span>
    </button>
  )
}

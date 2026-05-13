import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
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

export function LikeButton({
  postSlug,
  initialLiked = false,
  initialCount = 0,
  className,
}: LikeButtonProps) {
  const { isAuthenticated } = useCustomerAuth()
  const { liked, count, toggle, pending } = usePostLike({
    slug: postSlug,
    initialLiked,
    initialCount,
  })

  if (!isAuthenticated) {
    return (
      <a
        href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
        data-slot="like-button-prompt"
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-clama-blog-border-soft bg-clama-blog-comment-bg px-3 py-1.5 text-sm text-clama-blog-purple-prose hover:bg-clama-blog-cream-warm",
          className,
        )}
      >
        <Heart aria-hidden className="h-4 w-4" />
        <span>{count}</span>
        <span className="sr-only">— faça login pra curtir</span>
      </a>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={liked}
      aria-label={liked ? "Remover curtida" : "Curtir post"}
      disabled={pending}
      onClick={toggle}
      data-slot="like-button"
      data-liked={liked ? "true" : "false"}
      className={cn(
        "inline-flex items-center gap-2",
        liked && "border-clama-blog-gold-deep text-clama-blog-gold-deep",
        className,
      )}
    >
      <Heart
        aria-hidden
        className={cn("h-4 w-4", liked && "fill-clama-blog-gold-deep")}
      />
      <span aria-label={microcopy.likes.countLabel(count)}>{count}</span>
    </Button>
  )
}

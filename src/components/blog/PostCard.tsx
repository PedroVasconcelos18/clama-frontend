import { Heart, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { readingTimeMin } from "@/lib/datetime"
import { PostMeta } from "./PostMeta"
import type { Post } from "@/types/blog.types"

export type PostCardInput = Pick<
  Post,
  | "slug"
  | "titulo"
  | "excerpt"
  | "imagem_capa_url"
  | "data_publicacao"
  | "created_at"
  | "autor"
  | "conteudo_html"
> & {
  like_count?: number
  comment_count?: number
}

export type PostCardProps = {
  post: PostCardInput
  className?: string
}

export function PostCard({ post, className }: PostCardProps) {
  const readMin = readingTimeMin(post.conteudo_html ?? post.excerpt ?? "")

  return (
    <a
      href={`/blog/${post.slug}`}
      aria-label={`Ler post: ${post.titulo}`}
      className={cn(
        "group block rounded-lg border border-clama-blog-border-soft bg-clama-blog-comment-bg shadow-sm transition-all duration-200",
        "hover:scale-[1.01] hover:shadow-md",
        "[-webkit-tap-highlight-color:transparent]",
        className,
      )}
    >
      {post.imagem_capa_url && (
        <div className="aspect-[16/9] overflow-hidden rounded-t-lg bg-clama-blog-cream-warm">
          <img
            src={post.imagem_capa_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-5">
        <h2 className="line-clamp-2 font-serif text-[22px] leading-tight text-clama-blog-purple-prose">
          {post.titulo}
        </h2>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-clama-blog-purple-prose/80">
            {post.excerpt}
          </p>
        )}
        <PostMeta
          post={{
            autor: post.autor,
            data_publicacao: post.data_publicacao,
            created_at: post.created_at,
          }}
          compact
          className="mt-4"
        />
        <div className="mt-3 flex items-center gap-3 text-sm text-clama-blog-purple-prose/60">
          <span className="inline-flex items-center gap-1">
            <Heart aria-hidden className="h-4 w-4" />
            <span aria-label={`${post.like_count ?? 0} likes`}>
              {post.like_count ?? 0}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle aria-hidden className="h-4 w-4" />
            <span aria-label={`${post.comment_count ?? 0} comentários`}>
              {post.comment_count ?? 0}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span>{readMin} min de leitura</span>
        </div>
      </div>
    </a>
  )
}

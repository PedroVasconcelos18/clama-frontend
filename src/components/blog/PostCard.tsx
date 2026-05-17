import { Heart, MessageCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { readingTimeMin, tempoRelativo } from "@/lib/datetime"
import { categoriaLabel, inicial } from "@/lib/blog/presentation"
import { PostThumb, hasCapa } from "./PostThumb"

export type PostCardInput = {
  slug: string
  titulo: string
  excerpt: string
  imagem_capa_url?: string
  data_publicacao: string | null
  historia_ilustrativa?: boolean
  autor_nome: string
  like_count?: number
  comment_count?: number
  /** Só presente no detail; no list usamos o excerpt pra estimar. */
  conteudo_html?: string
}

export type PostCardProps = {
  post: PostCardInput
  /** "featured" = card horizontal grande (1º post). "grid" = card vertical. */
  variant?: "featured" | "grid"
  className?: string
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-clama-gold-soft">
      {children}
    </span>
  )
}

function MetaFooter({
  post,
  readMin,
}: {
  post: PostCardInput
  readMin: number
}) {
  const quando = post.data_publicacao
    ? tempoRelativo(post.data_publicacao)
    : null
  return (
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-clama-gold/10 pt-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clama-night-soft to-clama-gold/70 text-xs font-semibold text-clama-cream"
        >
          {inicial(post.autor_nome)}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[0.82rem] font-medium text-clama-cream">
            {post.autor_nome}
          </span>
          {quando && (
            <span className="text-[0.72rem] text-clama-cream/50">{quando}</span>
          )}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-[0.74rem] text-clama-cream/55">
        <span className="inline-flex items-center gap-1">
          <Heart aria-hidden className="h-3.5 w-3.5" />
          {post.like_count ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle aria-hidden className="h-3.5 w-3.5" />
          {post.comment_count ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock aria-hidden className="h-3.5 w-3.5" />
          {readMin} min
        </span>
      </div>
    </div>
  )
}

export function PostCard({ post, variant = "grid", className }: PostCardProps) {
  const readMin = readingTimeMin(post.conteudo_html ?? post.excerpt ?? "")
  const categoria = categoriaLabel(Boolean(post.historia_ilustrativa))
  const comCapa = hasCapa(post.imagem_capa_url)

  const shell =
    "group relative block overflow-hidden rounded-2xl border border-clama-gold/15 bg-clama-night-deep transition-all duration-300 hover:border-clama-gold/35 hover:shadow-[0_0_40px_-12px_rgba(240,192,64,0.25)] [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold/60"

  if (variant === "featured") {
    return (
      <a
        href={`/blog/${post.slug}`}
        aria-label={`Ler post: ${post.titulo}`}
        className={cn(shell, comCapa && "md:grid md:grid-cols-2", className)}
      >
        {comCapa && (
          <div className="aspect-[16/10] overflow-hidden md:aspect-auto md:h-full">
            <PostThumb
              imagemCapaUrl={post.imagem_capa_url}
              alt=""
              className="transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        )}
        <div
          className={cn(
            "flex flex-col justify-center",
            comCapa ? "p-7 md:p-9" : "p-8 md:p-12",
          )}
        >
          <Eyebrow>{categoria}</Eyebrow>
          <h2 className="mt-3 font-serif text-[1.75rem] leading-[1.15] text-clama-cream md:text-[2.1rem]">
            {post.titulo}
          </h2>
          {post.excerpt && (
            <p
              className={cn(
                "mt-3 text-[0.95rem] leading-relaxed text-clama-cream/70",
                comCapa ? "line-clamp-3" : "max-w-2xl line-clamp-4",
              )}
            >
              {post.excerpt}
            </p>
          )}
          <MetaFooter post={post} readMin={readMin} />
        </div>
      </a>
    )
  }

  return (
    <a
      href={`/blog/${post.slug}`}
      aria-label={`Ler post: ${post.titulo}`}
      className={cn(shell, "flex h-full flex-col", className)}
    >
      {comCapa && (
        <div className="aspect-[16/9] overflow-hidden">
          <PostThumb
            imagemCapaUrl={post.imagem_capa_url}
            alt=""
            className="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <Eyebrow>{categoria}</Eyebrow>
        <h2 className="mt-2.5 line-clamp-2 font-serif text-[1.3rem] leading-snug text-clama-cream">
          {post.titulo}
        </h2>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-[0.88rem] leading-relaxed text-clama-cream/65">
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto">
          <MetaFooter post={post} readMin={readMin} />
        </div>
      </div>
    </a>
  )
}

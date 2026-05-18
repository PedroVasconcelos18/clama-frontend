import { cn } from "@/lib/utils"
import { tempoRelativo } from "@/lib/datetime"

export type PostMetaInput = {
  autor: string | { nome: string }
  data_publicacao?: string | null
  created_at?: string
  readingTimeMin?: number
}

export type PostMetaProps = {
  post: PostMetaInput
  compact?: boolean
  className?: string
}

function autorNome(autor: PostMetaInput["autor"]): string {
  return typeof autor === "string" ? autor : autor.nome
}

function inicial(nome: string): string {
  const first = nome.trim().charAt(0)
  return first ? first.toUpperCase() : "C"
}

export function PostMeta({ post, compact = false, className }: PostMetaProps) {
  const nome = autorNome(post.autor)
  const data = post.data_publicacao ?? post.created_at ?? null
  const tempo = data ? tempoRelativo(data) : null
  const sizeClass = compact ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm"

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-clama-cream/80",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-clama-cream",
          "bg-gradient-to-br from-clama-night-soft to-clama-gold",
          sizeClass,
        )}
      >
        {inicial(nome)}
      </span>
      <span className="font-medium text-clama-cream">{nome}</span>
      {tempo && (
        <>
          <span aria-hidden>·</span>
          <time
            dateTime={data ?? undefined}
            className="text-clama-cream/60"
            suppressHydrationWarning
          >
            {tempo}
          </time>
        </>
      )}
      {typeof post.readingTimeMin === "number" && (
        <>
          <span aria-hidden>·</span>
          <span className="text-clama-cream/60">
            {post.readingTimeMin} min de leitura
          </span>
        </>
      )}
    </div>
  )
}

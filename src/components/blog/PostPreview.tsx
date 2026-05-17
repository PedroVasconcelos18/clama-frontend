import { cn } from "@/lib/utils"

export type PostPreviewMeta = {
  titulo?: string
  autor?: string
  dataPublicacao?: string
  readingTimeMin?: number
}

export type PostPreviewProps = {
  html: string
  meta?: PostPreviewMeta
  className?: string
}

function formatData(iso?: string): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

/**
 * Renderiza HTML de post no estilo prose-clama.
 * O HTML vem do Tiptap (preview) ou do backend (que sanitiza via bleach na
 * Story 2.2). Em ambos os casos é seguro renderizar via dangerouslySetInnerHTML.
 */
export function PostPreview({ html, meta, className }: PostPreviewProps) {
  return (
    <article
      data-slot="post-preview"
      className={cn(
        "prose prose-clama mx-auto rounded-md border border-clama-gold/20 bg-clama-night-soft p-6",
        className,
      )}
    >
      {meta && (
        <header className="not-prose mb-6 border-b border-clama-gold/20 pb-4">
          {meta.titulo && (
            <h1 className="font-serif text-3xl text-clama-cream">
              {meta.titulo}
            </h1>
          )}
          <p className="mt-2 text-sm text-clama-cream/70">
            {meta.autor && <span>{meta.autor}</span>}
            {meta.dataPublicacao && (
              <>
                {meta.autor && <span> · </span>}
                <time dateTime={meta.dataPublicacao}>
                  {formatData(meta.dataPublicacao)}
                </time>
              </>
            )}
            {typeof meta.readingTimeMin === "number" && (
              <>
                {(meta.autor || meta.dataPublicacao) && <span> · </span>}
                <span>{meta.readingTimeMin} min de leitura</span>
              </>
            )}
          </p>
        </header>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}

import { useData } from "vike-react/useData"
import { CTAClamar } from "@/components/blog/CTAClamar"
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar"
import { PostThumb, hasCapa } from "@/components/blog/PostThumb"
import { SiteHeader } from "@/components/clama/SiteHeader"
import { readingTimeMin, tempoRelativo } from "@/lib/datetime"
import { categoriaLabel, inicial } from "@/lib/blog/presentation"
import { CommentForm } from "../_islands/CommentForm"
import { CommentList } from "../_islands/CommentList"
import { LikeButton } from "../_islands/LikeButton"
import { SharePostButton } from "../_islands/SharePostButton"
import type { BlogPostData } from "./+data"

/**
 * Destaca a última palavra do título em itálico dourado — reproduz o gesto
 * editorial dos mockups ("Quando a oração é só *silêncio*") de forma genérica.
 */
function TituloEditorial({ titulo }: { titulo: string }) {
  const partes = titulo.trim().split(/\s+/)
  if (partes.length < 2) {
    return <span className="italic text-clama-gold">{titulo}</span>
  }
  const ultima = partes.pop() as string
  return (
    <>
      {partes.join(" ")} <span className="italic text-clama-gold">{ultima}</span>
    </>
  )
}

export default function BlogPostPage() {
  const data = useData<BlogPostData>()

  if (!data.post) {
    return (
      <main className="min-h-screen bg-clama-night text-clama-cream">
        <SiteHeader active="blog" />
        <section className="mx-auto max-w-2xl px-5 py-24 text-center">
          <p className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-clama-gold-soft">
            Página não encontrada
          </p>
          <h1 className="mt-4 font-serif text-3xl text-clama-cream">
            Não encontramos esse texto.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-clama-cream/60">
            Pode ter sido despublicado ou o link está incompleto.
          </p>
          <a
            href="/blog"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-clama-gold px-6 py-3 text-sm font-semibold text-clama-night transition-colors hover:bg-clama-gold-soft"
          >
            ← Ver outros textos
          </a>
        </section>
      </main>
    )
  }

  const { post } = data
  const readMin = readingTimeMin(post.conteudo_html)
  const categoria = categoriaLabel(Boolean(post.historia_ilustrativa))
  const quando = post.data_publicacao
    ? tempoRelativo(post.data_publicacao)
    : null

  return (
    <>
      <a
        href="#post-conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-clama-gold focus:px-3 focus:py-1 focus:text-clama-night"
      >
        Pular pro conteúdo
      </a>
      <ReadingProgressBar />
      <main className="min-h-screen bg-clama-night text-clama-cream">
        <SiteHeader active="blog" />

        <article id="post-conteudo" className="mx-auto max-w-[720px] px-5 pb-16">
          <header className="pt-10 md:pt-14">
            <a
              href="/blog"
              className="inline-flex items-center gap-1.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-clama-gold-soft transition-colors hover:text-clama-gold"
            >
              ← Voltar ao blog
            </a>

            <p className="mt-8 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-clama-gold-soft">
              {categoria} · {readMin} min de leitura
            </p>

            <h1 className="mt-4 font-serif text-[2.2rem] leading-[1.12] tracking-tight text-clama-cream md:text-[3.25rem]">
              <TituloEditorial titulo={post.titulo} />
            </h1>

            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-clama-night-soft to-clama-gold/70 text-sm font-semibold text-clama-cream"
                >
                  {inicial(post.autor_nome)}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[0.9rem] font-medium text-clama-cream">
                    {post.autor_nome}
                  </span>
                  {quando && (
                    <span className="text-[0.76rem] text-clama-cream/50">
                      {quando}
                    </span>
                  )}
                </span>
              </div>
              {post.historia_ilustrativa && (
                <span className="rounded-full border border-clama-gold/30 bg-clama-gold/10 px-3 py-1 font-sans text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-clama-gold">
                  História ilustrativa — não é um relato literal
                </span>
              )}
            </div>
          </header>

          {hasCapa(post.imagem_capa_url) && (
            <div className="mt-9 aspect-[16/9] overflow-hidden rounded-2xl border border-clama-gold/15">
              <PostThumb imagemCapaUrl={post.imagem_capa_url} alt="" />
            </div>
          )}

          <div
            className="prose prose-clama mt-10 max-w-none"
            dangerouslySetInnerHTML={{ __html: post.conteudo_html }}
          />

          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-clama-gold/10 pt-8">
            <LikeButton postSlug={post.slug} initialCount={post.like_count} />
            <SharePostButton titulo={post.titulo} />
          </div>

          <div className="mt-12">
            <CTAClamar variant="bottom" />
          </div>

          <section
            aria-label="Comentários"
            className="mt-14 border-t border-clama-gold/10 pt-10"
          >
            <CommentForm postSlug={post.slug} />
            <div className="mt-8">
              <CommentList
                postSlug={post.slug}
                initialCount={post.comment_count}
              />
            </div>
          </section>

          <div className="mt-12">
            <CTAClamar variant="after-comments" />
          </div>
        </article>
      </main>
    </>
  )
}

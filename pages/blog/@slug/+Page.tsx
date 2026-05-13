import { useData } from "vike-react/useData"
import { CTAClamar } from "@/components/blog/CTAClamar"
import { PostMeta } from "@/components/blog/PostMeta"
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar"
import { readingTimeMin } from "@/lib/datetime"
import type { BlogPostData } from "./+data"

export default function BlogPostPage() {
  const data = useData<BlogPostData>()

  if (!data.post) {
    return (
      <main className="min-h-screen bg-clama-blog-cream-warm">
        <header className="border-b border-clama-blog-border-soft bg-white px-4 py-6">
          <div className="mx-auto max-w-5xl">
            <a
              href="/blog"
              className="font-serif text-xl text-clama-blog-purple-prose"
            >
              Clama
            </a>
          </div>
        </header>
        <section className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-serif text-3xl text-clama-blog-purple-prose">
            Não encontramos esse post.
          </h1>
          <p className="mt-4 text-clama-blog-purple-prose/70">
            Pode ter sido despublicado ou o link está incompleto.
          </p>
          <a
            href="/blog"
            className="mt-6 inline-block rounded-md bg-clama-blog-gold-deep px-5 py-2 text-clama-cream"
          >
            Ver outros posts
          </a>
        </section>
      </main>
    )
  }

  const { post } = data
  const readMin = readingTimeMin(post.conteudo_html)

  return (
    <>
      <a
        href="#post-conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-clama-blog-gold-deep focus:px-3 focus:py-1 focus:text-clama-cream"
      >
        Pular pro conteúdo
      </a>
      <ReadingProgressBar />
      <main className="min-h-screen bg-clama-blog-cream-warm">
        <header className="border-b border-clama-blog-border-soft bg-white px-4 py-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <a
              href="/blog"
              className="font-serif text-xl text-clama-blog-purple-prose"
            >
              Clama
            </a>
            <nav className="flex gap-4 text-sm">
              <a href="/blog" className="text-clama-blog-purple-prose/70">
                Blog
              </a>
              <a href="/conta" className="text-clama-blog-purple-prose/70">
                Conta
              </a>
            </nav>
          </div>
        </header>

        <article
          id="post-conteudo"
          className="mx-auto max-w-[680px] px-4 py-10"
        >
          <header className="mb-8">
            <h1 className="font-serif text-4xl leading-tight text-clama-blog-purple-prose">
              {post.titulo}
            </h1>
            <PostMeta
              post={{
                autor: post.autor_nome,
                data_publicacao: post.data_publicacao,
                readingTimeMin: readMin,
              }}
              className="mt-4"
            />
            {post.historia_ilustrativa && (
              <p className="mt-3 inline-block rounded-full bg-clama-blog-gold-soft/30 px-3 py-1 text-xs text-clama-blog-purple-prose">
                História ilustrativa — não é um relato literal
              </p>
            )}
          </header>

          {post.imagem_capa_url && (
            <img
              src={post.imagem_capa_url}
              alt=""
              className="mb-8 aspect-[16/9] w-full rounded-lg object-cover"
            />
          )}

          <div
            className="prose prose-clama max-w-none"
            dangerouslySetInnerHTML={{ __html: post.conteudo_html }}
          />

          <div className="mt-12">
            <CTAClamar variant="bottom" />
          </div>

          <section
            aria-label="Comentários"
            className="mt-12 border-t border-clama-blog-border-soft pt-8"
          >
            <h2 className="font-serif text-2xl text-clama-blog-purple-prose">
              Comentários
            </h2>
            <p className="mt-2 text-clama-blog-purple-prose/60">
              Comentários e curtidas chegam na Story 4.7.
            </p>
          </section>

          <div className="mt-10">
            <CTAClamar variant="after-comments" />
          </div>
        </article>
      </main>
    </>
  )
}

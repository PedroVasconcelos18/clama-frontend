import { useData } from "vike-react/useData"
import { PostCard } from "@/components/blog/PostCard"
import type { BlogIndexData } from "./+data"

export default function BlogIndexPage() {
  const data = useData<BlogIndexData>()
  const isEmpty = data.posts.length === 0

  return (
    <main className="min-h-screen bg-clama-blog-cream-warm">
      <header className="border-b border-clama-blog-border-soft bg-white px-4 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="font-serif text-xl text-clama-blog-purple-prose">
            Clama
          </a>
          <nav className="flex gap-4 text-sm">
            <a href="/blog" className="font-medium text-clama-blog-gold-deep">
              Blog
            </a>
            <a href="/conta" className="text-clama-blog-purple-prose/70">
              Conta
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-serif text-3xl text-clama-blog-purple-prose">
          Blog do Clama
        </h1>
        <p className="mt-2 text-clama-blog-purple-prose/70">
          Orações, reflexões e histórias pra caminhar com você.
        </p>

        {isEmpty ? (
          <div className="mt-12 rounded-lg border border-clama-blog-border-soft bg-white p-8 text-center">
            <p className="font-serif text-xl text-clama-blog-purple-prose">
              {data.apiAvailable
                ? "Os primeiros posts estão chegando em breve."
                : "Os posts vão aparecer aqui em instantes."}
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.posts.map((post) => (
              <li key={post.slug}>
                <PostCard
                  post={{
                    slug: post.slug,
                    titulo: post.titulo,
                    excerpt: post.excerpt,
                    imagem_capa_url: post.imagem_capa_url,
                    data_publicacao: post.data_publicacao,
                    created_at: post.data_publicacao,
                    autor: post.autor_nome,
                    conteudo_html: "",
                    like_count: post.like_count,
                    comment_count: post.comment_count,
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        {(data.hasNext || data.hasPrevious) && (
          <nav className="mt-10 flex items-center justify-between" aria-label="Paginação">
            {data.hasPrevious ? (
              <a
                href={`/blog?page=${data.page - 1}`}
                className="rounded-md border border-clama-blog-border-soft bg-white px-4 py-2 text-sm text-clama-blog-purple-prose hover:bg-clama-blog-cream-warm"
              >
                ← Anterior
              </a>
            ) : (
              <span />
            )}
            <span className="text-sm text-clama-blog-purple-prose/60">
              Página {data.page}
            </span>
            {data.hasNext ? (
              <a
                href={`/blog?page=${data.page + 1}`}
                className="rounded-md border border-clama-blog-border-soft bg-white px-4 py-2 text-sm text-clama-blog-purple-prose hover:bg-clama-blog-cream-warm"
              >
                Próxima →
              </a>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </main>
  )
}

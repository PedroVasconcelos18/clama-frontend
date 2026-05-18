import { useData } from "vike-react/useData"
import { PostCard } from "@/components/blog/PostCard"
import { SiteHeader } from "@/components/clama/SiteHeader"
import type { BlogIndexData } from "./+data"

/** Divisor decorativo: linha sutil com losango dourado no centro (do design). */
function Divisor() {
  return (
    <div
      aria-hidden
      className="my-7 flex items-center justify-center gap-3"
    >
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-clama-gold/30" />
      <span className="h-1.5 w-1.5 rotate-45 bg-clama-gold/60" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-clama-gold/30" />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 0%, rgba(240,192,64,0.12), rgba(0,0,0,0) 70%), radial-gradient(40% 30% at 30% 20%, rgba(212,160,23,0.08), rgba(0,0,0,0) 70%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-5 pt-14 pb-4 md:pt-20">
        <p className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-clama-gold-soft">
          Blog do Clama
        </p>
        <h1 className="mt-5 font-serif text-[2.6rem] leading-[1.05] tracking-tight text-clama-cream md:text-[5rem]">
          Orações, reflexões e{" "}
          <span className="italic text-clama-gold">histórias</span>{" "}
          <span className="text-clama-cream/75">pra caminhar com você.</span>
        </h1>
        <Divisor />
        <p className="text-center font-serif text-[0.95rem] italic text-clama-cream/45">
          publicamos quando há algo verdadeiro a dizer
        </p>
      </div>
    </section>
  )
}

function EmptyState({ apiAvailable }: { apiAvailable: boolean }) {
  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-dashed border-clama-gold/25 bg-clama-night-deep/60 px-6 py-16 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-clama-gold/40 bg-clama-gold/10">
        <span className="text-2xl" role="img" aria-label="gota">
          🕯️
        </span>
      </div>
      <h2 className="font-serif text-2xl text-clama-cream">
        Ainda nada por aqui.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[0.92rem] leading-relaxed text-clama-cream/55">
        {apiAvailable
          ? "A primeira oração está sendo escrita — ou peça a sua agora, e ela pode virar o próximo texto deste blog."
          : "Os posts vão aparecer aqui em instantes."}
      </p>
      <a
        href="/"
        className="mt-7 inline-flex items-center gap-2 rounded-full bg-clama-gold px-6 py-3 text-sm font-semibold text-clama-night transition-colors hover:bg-clama-gold-soft"
      >
        Pedir minha oração →
      </a>
    </div>
  )
}

export default function BlogIndexPage() {
  const data = useData<BlogIndexData>()
  const isEmpty = data.posts.length === 0

  // Featured = 1º post (mais recente) só na página 1 sem filtros. Demais
  // páginas mostram tudo no grid.
  const showFeatured = data.page === 1 && data.posts.length > 0
  const featured = showFeatured ? data.posts[0] : null
  const gridPosts = showFeatured ? data.posts.slice(1) : data.posts

  return (
    <main className="min-h-screen bg-clama-night text-clama-cream">
      <SiteHeader active="blog" />
      <Hero />

      <section className="mx-auto max-w-5xl px-5 pb-20">
        {isEmpty ? (
          <EmptyState apiAvailable={data.apiAvailable} />
        ) : (
          <>
            {featured && (
              <div className="mt-6">
                <PostCard post={featured} variant="featured" />
              </div>
            )}

            {gridPosts.length > 0 && (
              <>
                <div className="mt-14 flex items-end justify-between">
                  <h2 className="font-serif text-[1.7rem] leading-tight text-clama-cream">
                    Publicações
                    <br className="hidden sm:block" /> recentes
                  </h2>
                  <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-clama-gold-soft">
                    {data.count} {data.count === 1 ? "post" : "posts"}
                  </span>
                </div>

                <ul className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {gridPosts.map((post) => (
                    <li key={post.slug}>
                      <PostCard post={post} variant="grid" />
                    </li>
                  ))}
                </ul>
              </>
            )}

            {(data.hasNext || data.hasPrevious) && (
              <nav
                className="mt-14 flex items-center justify-between border-t border-clama-gold/10 pt-6"
                aria-label="Paginação"
              >
                {data.hasPrevious ? (
                  <a
                    href={`/blog?page=${data.page - 1}`}
                    className="rounded-full border border-clama-gold/30 px-5 py-2 text-sm text-clama-cream transition-colors hover:bg-clama-night-soft"
                  >
                    ← Anterior
                  </a>
                ) : (
                  <span />
                )}
                <span className="font-sans text-[0.78rem] uppercase tracking-[0.18em] text-clama-cream/50">
                  Página {data.page}
                </span>
                {data.hasNext ? (
                  <a
                    href={`/blog?page=${data.page + 1}`}
                    className="rounded-full border border-clama-gold/30 px-5 py-2 text-sm text-clama-cream transition-colors hover:bg-clama-night-soft"
                  >
                    Próxima →
                  </a>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  )
}

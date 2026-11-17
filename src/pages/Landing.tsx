import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { StickyNav } from "@/components/clama/StickyNav"
import { Footer } from "@/components/clama/Footer"
import { ClamorForm } from "@/components/clama/ClamorForm"
import { InstituicaoPicker } from "@/components/clama/InstituicaoPicker"
import { useScrollToPedido } from "@/hooks/useScrollToPedido"
import { useIsInView } from "@/hooks/useIsInView"
import { apiFetch } from "@/lib/api"
import { buscarMetas, type Metas } from "@/lib/api/metas"
import type { Instituicao } from "@/types/instituicao.types"

const PASSOS = [
  ["Escreva seu clamor", "Com suas palavras. Se quiser, escolha um tema para começar."],
  ["Receba sua oração", "Sua oração é escrita com ajuda de IA a partir das suas palavras e chega no seu e-mail."],
  ["Guarde sua jornada", "Com uma conta, você guarda suas orações e vê tudo o que já pediu."],
]

export default function Landing() {
  const formRef = useRef<HTMLDivElement>(null)
  const scrollToPedido = useScrollToPedido(formRef)
  const formVisivel = useIsInView(formRef)
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([])
  const [metas, setMetas] = useState<Metas | null>(null)

  useEffect(() => {
    apiFetch<Instituicao[]>("/api/instituicoes", { showToast: false }).then(setInstituicoes, () => {})
    buscarMetas().then(setMetas, () => {})
  }, [])

  return (
    <div className="min-h-screen bg-clama-night text-clama-cream">
      <StickyNav onCtaClick={scrollToPedido} showCta={!formVisivel} />

      <main>
        <section className="px-6 py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clama-gold">Pela oração nos achegamos a Ele</p>
              <h1 className="font-display text-5xl leading-none md:text-7xl">
                Ninguém precisa clamar <em className="text-clama-gold">sozinho</em>.
              </h1>
              <p className="max-w-[34ch] text-lg text-clama-cream/80">
                Escreva o que pesa no seu coração. Você recebe uma oração escrita com ajuda de IA a partir das suas palavras.
              </p>
              <figure className="m-0 hidden max-w-[44ch] sm:block">
                <blockquote className="font-verse text-xl italic text-clama-cream/90">
                  “Clama a mim e te responderei, e te anunciarei coisas grandes e ocultas que não conheces.”
                </blockquote>
                <figcaption className="mt-1 text-sm text-clama-gold">Jeremias 33:3</figcaption>
              </figure>
            </div>
            <div ref={formRef}>
              <ClamorForm />
            </div>
          </div>
        </section>

        <section className="bg-clama-cream px-6 py-16 text-clama-night">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clama-gold-soft">Como funciona</p>
            <h2 className="mb-8 font-display text-4xl">Três passos, sem pressa</h2>
            <ol className="grid list-none gap-4 p-0 md:grid-cols-3">
              {PASSOS.map(([t, d], i) => (
                <li key={t} className="flex flex-col gap-2 rounded-[20px] border border-clama-cream-warm bg-white/60 p-6">
                  <span className="font-display text-4xl text-clama-gold-soft">{i + 1}</span>
                  <h3 className="font-display text-xl">{t}</h3>
                  <p className="text-[15px] text-clama-night/75">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-clama-cream px-6 pb-16 text-clama-night">
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clama-gold-soft">Contribuição</p>
              <h2 className="font-display text-4xl">Dê conforme o que o coração manda</h2>
              <p className="max-w-[52ch] text-lg text-clama-night/75">
                Existe sempre um caminho gratuito. Ao pedir oração, quem pode contribuir sustenta o Clama e uma instituição parceira.
                Nenhuma contribuição muda a oração nem promete resultado.
              </p>
              <Link
                to="/como-funciona"
                className="self-start rounded-full bg-clama-night px-6 py-3 font-semibold text-clama-cream hover:bg-clama-night-soft"
              >
                Ver para onde vai
              </Link>
            </div>
            {instituicoes.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-2xl">Metas do mês</h3>
                <InstituicaoPicker instituicoes={instituicoes} metas={metas} />
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

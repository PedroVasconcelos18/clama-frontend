import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { StickyNav } from "@/components/clama/StickyNav"
import { Footer } from "@/components/clama/Footer"
import { buscarMetas } from "@/lib/api/metas"

const PASSOS = [
  { t: "Você clama", d: "Escreve com suas palavras, escolhe um tema se ajudar, a instituição que quer apoiar e se quer contribuir. Não precisa de conta." },
  { t: "Sua oração é escrita com ajuda de IA a partir das suas palavras", d: "Você recebe a oração na tela e, se quiser, também por e-mail." },
  { t: "Com uma conta, você guarda suas orações", d: "Ao final, você cria sua senha e passa a ter a sua jornada, com tudo o que já pediu." },
]

const NAO_FAZ = [
  ["Não prometemos cura, dinheiro ou milagre.", "Nenhuma oração aqui vem com garantia de resultado."],
  ["Não substituímos tratamento.", "Oração caminha junto com médicos, psicólogos e redes de apoio, nunca no lugar deles."],
  ["Não ligamos contribuição a bênção.", "Quem contribui e quem não pode contribuir recebe a mesma oração."],
  ["Não escondemos quem escreve.", "A oração é escrita com ajuda de inteligência artificial a partir das suas palavras."],
]

const FAQ = [
  ["Preciso de conta?", "Para fazer um clamor e receber a oração, não. A conta serve para guardar suas orações e acompanhar sua jornada."],
  ["Preciso pagar para receber uma oração?", "Não. Existe sempre a opção gratuita, e ela não é uma versão pior. A contribuição é livre e serve para sustentar o projeto e a instituição parceira que você escolher."],
  ["Quem escreve a oração?", "A oração é escrita com ajuda de inteligência artificial a partir das suas palavras. É a mesma oração para todos, com ou sem contribuição."],
  ["E se eu estiver em crise?", "Procure ajuda agora. Ligue para o CVV no 188, de graça e a qualquer hora, ou vá ao serviço de saúde mais próximo. O Clama é apoio espiritual e não substitui atendimento."],
]

export default function ComoFunciona() {
  const [percentual, setPercentual] = useState<number | null>(null)

  useEffect(() => {
    let ativo = true
    buscarMetas()
      .then((m) => ativo && setPercentual(m.percentual))
      .catch(() => {}) // sem metas, a página só omite o percentual
    return () => {
      ativo = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-clama-night-deep text-clama-cream">
      <StickyNav />
      <main>
        <section className="bg-clama-night px-6 py-16">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-clama-gold">Como funciona</p>
            <h1 className="font-display text-5xl md:text-7xl leading-none">
              Uma comunidade que <em className="text-clama-gold">ora junto</em>.
            </h1>
            <p className="font-verse italic text-xl text-clama-cream/80 max-w-[34ch]">
              Você escreve o que pesa no coração e recebe uma oração. Sem prometer o que não podemos.
            </p>
          </div>
        </section>

        <section className="bg-clama-cream text-clama-night px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-4xl mb-8">Do clamor à oração</h2>
            <ol className="grid gap-4 md:grid-cols-3 list-none p-0">
              {PASSOS.map((p, i) => (
                <li key={p.t} className="rounded-[20px] border border-clama-cream-warm bg-white/60 p-6 flex flex-col gap-2">
                  <span className="font-display text-4xl text-clama-gold-soft">{i + 1}</span>
                  <h3 className="font-display text-xl">{p.t}</h3>
                  <p className="text-[15px] text-clama-night/75">{p.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-clama-cream text-clama-night px-6 pb-16">
          <div className="max-w-5xl mx-auto flex flex-col gap-3">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-clama-gold-soft">Transparência</p>
            <h2 className="font-display text-4xl">Para onde vai o dinheiro</h2>
            <p className="max-w-[52ch] text-clama-night/75">
              Contribuir é opcional. A parte do Clama paga tecnologia e manutenção da plataforma.
            </p>
            {percentual !== null && (
              <p className="rounded-2xl border border-clama-night/15 bg-clama-night/5 p-4 text-[15px]">
                Ao pedir oração: <strong>{percentual}%</strong> para a instituição que você escolhe
              </p>
            )}
          </div>
        </section>

        <section className="bg-clama-cream text-clama-night px-6 pb-16">
          <div className="max-w-5xl mx-auto">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-clama-gold-soft mb-2">O que o Clama não faz</p>
            <h2 className="font-display text-4xl mb-6">Acompanhamos o clamor. Não garantimos desfecho.</h2>
            <ul className="list-none p-0 flex flex-col gap-4">
              {NAO_FAZ.map(([t, d]) => (
                <li key={t}>
                  <b className="block">{t}</b>
                  <span className="text-clama-night/75">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-clama-night px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-clama-gold mb-2">Perguntas</p>
            <h2 className="font-display text-4xl mb-6">O que as pessoas perguntam</h2>
            {FAQ.map(([q, a]) => (
              <details key={q} className="border-b border-clama-gold/20 py-4">
                <summary className="cursor-pointer font-semibold">{q}</summary>
                <p className="mt-2 text-clama-cream/80">{a}</p>
              </details>
            ))}
            <Link
              to="/"
              className="inline-flex mt-8 min-h-[52px] items-center rounded-full bg-clama-gold px-7 font-semibold text-clama-night hover:bg-clama-gold-soft"
            >
              Fazer meu clamor
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

import { useEffect, useRef, useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { StickyNav } from "@/components/clama/StickyNav"
import { Footer } from "@/components/clama/Footer"
import { AvisoCvv } from "@/components/clama/AvisoCvv"
import { OfertaPicker } from "@/components/clama/OfertaPicker"
import { InstituicaoPicker } from "@/components/clama/InstituicaoPicker"
import PastoralAlert from "@/components/utility/PastoralAlert"
import { useSessao } from "@/contexts/SessaoContext"
import { useApi } from "@/hooks/useApi"
import { PastoralApiError, apiFetch } from "@/lib/api"
import { buscarMetas, type Metas } from "@/lib/api/metas"
import { corpoDoPedido, criarDoacaoAnonima } from "@/lib/api/doacoes"
import { criarPedidoGratuito } from "@/lib/api/freemium"
import { Turnstile, getTurnstileSiteKey, type TurnstileInstance } from "@/lib/captcha/turnstile"
import { formatCurrency, maskCpfCnpj, reaisParaCentavos } from "@/lib/formatters"
import { OFERTAS } from "@/lib/ofertas"
import { limparRascunho, lerRascunho, type Rascunho } from "@/lib/rascunho"
import { pedidoSchema, type PedidoFormData, type PedidoFormInput } from "@/lib/schemas/pedido"
import { TEMAS } from "@/lib/temas"
import type { Instituicao } from "@/types/instituicao.types"
import type { PedidoCriado, StatusPublico } from "@/types/pedido-status.types"

const MSG_INSTITUICAO = "Escolha a instituição que vai receber a sua parte da contribuição."
const MSG_LIVRE = "O valor mínimo é R$ 1,00. Se preferir, escolha Gratuito."
const MSG_GENERICA = "Algo não saiu como o esperado. Tente novamente."

const campo = "w-full rounded-[10px] border-[1.5px] border-clama-cream-warm bg-white px-3 py-2 text-[0.95rem] outline-none focus:border-clama-gold-soft"
const rotulo = "mb-1 block text-xs font-semibold uppercase tracking-wide text-clama-night/80"
const erroCls = "mt-1 text-sm text-red-700"

// Reuso do pedido pago (24h, mesmo prazo do Pix): só {id, assinatura SHA-256, criadoEm}, sem dado pessoal.
const CHAVE_PAGO = "clama:pedido-pago"
const REUSO_MS = 24 * 60 * 60 * 1000
type PedidoPago = { id: string; assinatura: string; criadoEm: number }

async function assinaturaDe(conteudo: unknown): Promise<string> {
  if (!globalThis.crypto?.subtle) return "" // sem SubtleCrypto, sem reuso
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(conteudo)))
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")
}

function lerPedidoPago(): PedidoPago | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PAGO) ?? "null")
  } catch {
    return null
  }
}

// Mesmo conteúdo, criado há menos de 24h e ainda aguardando pagamento: devolve o id. Falha de rede sobe.
async function pedidoReaproveitavel(assinatura: string): Promise<string | null> {
  const salvo = lerPedidoPago()
  if (!salvo || !assinatura || salvo.assinatura !== assinatura || !(Date.now() - salvo.criadoEm < REUSO_MS)) return null
  try {
    const atual = await apiFetch<StatusPublico>(`/api/pedidos/${salvo.id}`, { showToast: false })
    return atual.status === "AGUARDANDO_PAGAMENTO" ? salvo.id : null
  } catch (err) {
    if ((err as PastoralApiError).httpStatus === 404) return null
    throw err
  }
}

export default function Entrega() {
  const [rascunho] = useState(lerRascunho)
  if (!rascunho || !rascunho.texto.trim()) return <Navigate to="/" replace />
  return <EntregaForm rascunho={rascunho} />
}

function EntregaForm({ rascunho }: { rascunho: Rascunho }) {
  const navigate = useNavigate()
  const { usuario, carregando } = useSessao()
  const { fetchApi } = useApi()

  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([])
  const [metas, setMetas] = useState<Metas | null>(null)
  const [ofertaId, setOfertaId] = useState("gratuito")
  const [livre, setLivre] = useState("")
  const [instId, setInstId] = useState<number | null>(null)
  const [erroLivre, setErroLivre] = useState(false)
  const [erroInst, setErroInst] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [token, setToken] = useState("")
  const turnstile = useRef<TurnstileInstance>(null)

  const form = useForm<PedidoFormInput, unknown, PedidoFormData>({
    resolver: zodResolver(pedidoSchema),
    mode: "onTouched",
    defaultValues: { nome: "", email: "", cpf_cnpj: "" },
  })
  const { register, setValue, getValues, formState: { errors } } = form

  useEffect(() => {
    apiFetch<Instituicao[]>("/api/instituicoes", { showToast: false }).then(setInstituicoes, () => {})
    buscarMetas().then(setMetas, () => {}) // sem metas, as barras ficam em zero e o texto sem percentual
  }, [])

  // DEV: o widget invisível às vezes não emite o token em ambiente local (Cloudflare bloqueado, e2e).
  // A API em dev aceita qualquer token não vazio. Nunca roda em build de produção.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const t = setTimeout(() => setToken((atual) => atual || "dev-fallback-token"), 1500)
    return () => clearTimeout(t)
  }, [])

  // O logado vem com nome e e-mail da sessão (a sessão chega depois do primeiro render).
  useEffect(() => {
    if (!usuario) return
    if (!getValues("nome")) setValue("nome", usuario.nomeCompleto || "")
    if (!getValues("email")) setValue("email", usuario.email || "")
  }, [usuario, getValues, setValue])

  const oferta = OFERTAS.find((o) => o.id === ofertaId)!
  const valor = oferta.valorCentavos === null ? reaisParaCentavos(livre) : oferta.valorCentavos
  const pago = oferta.valorCentavos !== 0
  const tema = TEMAS.find((t) => t.id === rascunho.tema)
  const mostrarCvv = rascunho.risco !== false

  const rotuloEnvio =
    oferta.valorCentavos === 0 ? "Enviar meu clamor" : valor > 0 ? `Contribuir com ${formatCurrency(valor)} e enviar` : "Contribuir e enviar"

  function validarOferta(): boolean {
    const livreOk = !(pago && valor < 100)
    const instOk = !pago || instId !== null
    setErroLivre(!livreOk)
    setErroInst(instOk ? null : MSG_INSTITUICAO)
    return livreOk && instOk
  }

  async function enviar(dados: PedidoFormData) {
    if (!usuario && !token) {
      setErroEnvio("Aguarde a verificação anti-robô e tente de novo.")
      return
    }
    setEnviando(true)
    setErroEnvio(null)
    const base = corpoDoPedido(dados, rascunho)
    const corpo = pago ? { ...base, valorCentavos: valor, instituicao: instId ?? undefined } : base
    try {
      let id: string | undefined
      if (pago) {
        // Reuso: o token do Turnstile nem é gasto quando o pedido já existe.
        const assinatura = await assinaturaDe({ corpo, usuarioId: usuario?.id ?? null })
        id = (await pedidoReaproveitavel(assinatura)) ?? undefined
        if (!id) {
          id = usuario
            ? (await fetchApi<PedidoCriado>("/api/pedidos", { method: "POST", body: JSON.stringify(corpo), showToast: false })).id
            : (await criarDoacaoAnonima(corpo, token)).id
          try {
            localStorage.setItem(CHAVE_PAGO, JSON.stringify({ id, assinatura, criadoEm: Date.now() }))
          } catch {
            /* sem storage, sem reuso */
          }
        }
      } else if (usuario) {
        id = (
          await fetchApi<PedidoCriado>("/api/pedidos/gratuito", { method: "POST", body: JSON.stringify(corpo), showToast: false })
        ).id
      } else {
        await criarPedidoGratuito(corpo, token) // double opt-in: o link vai por e-mail
      }
      limparRascunho()
      if (id) navigate(`/confirmacao?pedido_id=${id}`)
      else navigate("/confirmado", { state: { email: dados.email } }) // só em memória, nunca na URL
    } catch (err) {
      const e = err as PastoralApiError
      if (e.code === "conta_existente") {
        navigate("/login", { state: { flashMessage: e.pastoralMessage, next: "/" } })
        return
      }
      // 400 dados_invalidos traz a explicação por campo; a instituição aparece no próprio campo.
      const { instituicao, ...outros } = e.campos ?? {}
      const resto = Object.values(outros).join(" ")
      if (instituicao) setErroInst(instituicao)
      if (!instituicao || resto) setErroEnvio(resto || e.pastoralMessage || MSG_GENERICA)
      setToken("") // o token do Turnstile é de uso único
      turnstile.current?.reset()
      setEnviando(false)
    }
  }

  function aoEnviar(e: React.FormEvent) {
    const oferaOk = validarOferta()
    void form.handleSubmit((d) => (oferaOk ? enviar(d) : undefined))(e)
  }

  const percentual = metas?.percentual

  return (
    <div className="min-h-screen bg-clama-cream text-clama-night">
      <StickyNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link to="/" className="mb-4 inline-block text-sm underline">
          Voltar ao clamor
        </Link>
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-4xl leading-tight md:text-5xl">
                Seu clamor já está <em className="text-clama-gold-soft">guardado</em>.
              </h1>
              <p className="text-lg text-clama-night/75">Falta pouco: nos diga quem você é e, se quiser, como contribuir.</p>
            </div>

            {erroEnvio && <PastoralAlert variant="error">{erroEnvio}</PastoralAlert>}

            <div className="flex flex-col gap-4 rounded-2xl border border-clama-cream-warm bg-white/60 p-5">
              <div>
                <label htmlFor="nome" className={rotulo}>Nome completo</label>
                <input id="nome" autoComplete="name" className={campo} aria-invalid={!!errors.nome} {...register("nome")} />
                {errors.nome && <p className={erroCls}>{errors.nome.message}</p>}
              </div>
              <div>
                <label htmlFor="email" className={rotulo}>E-mail</label>
                <input id="email" type="email" autoComplete="email" className={campo} aria-invalid={!!errors.email} {...register("email")} />
                {errors.email && <p className={erroCls}>{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="cpf" className={rotulo}>CPF ou CNPJ</label>
                <input
                  id="cpf"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className={campo}
                  aria-invalid={!!errors.cpf_cnpj}
                  {...register("cpf_cnpj", {
                    onChange: (e) => setValue("cpf_cnpj", maskCpfCnpj(e.target.value), { shouldValidate: true }),
                  })}
                />
                {errors.cpf_cnpj && <p className={erroCls}>{errors.cpf_cnpj.message}</p>}
              </div>
            </div>

            {mostrarCvv && <AvisoCvv />}

            <section className="flex flex-col gap-3">
              <h2 className="font-display text-3xl">Sua contribuição</h2>
              <p className="text-clama-night/75">
                Dê conforme o que o coração manda. Sua contribuição sustenta o Clama e uma instituição parceira. Ninguém fica sem
                oração por não poder contribuir.
              </p>
              <OfertaPicker value={ofertaId} onChange={(id) => { setOfertaId(id); setErroLivre(false); setErroInst(null) }} />
              {oferta.valorCentavos === null && (
                <div>
                  <label htmlFor="livre" className={rotulo}>Valor da contribuição (mín. R$ 1,00)</label>
                  <input
                    id="livre"
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    value={livre}
                    onChange={(e) => { setLivre(e.target.value); setErroLivre(false) }}
                    className={campo}
                    aria-invalid={erroLivre}
                    aria-describedby={erroLivre ? "erro-livre" : undefined}
                  />
                  {erroLivre && <p id="erro-livre" className={erroCls}>{MSG_LIVRE}</p>}
                </div>
              )}
              {pago && (
                <fieldset className="mt-2 flex flex-col gap-3 border-0 p-0">
                  <legend className="mb-1 font-display text-2xl">Para qual instituição vai a sua parte?</legend>
                  <p className="text-[15px] text-clama-night/75">
                    {percentual != null ? `${percentual}% da sua contribuição` : "Parte da sua contribuição"} vai para a instituição
                    que você escolher. O restante mantém o Clama.
                  </p>
                  <InstituicaoPicker
                    instituicoes={instituicoes}
                    metas={metas}
                    value={instId}
                    onChange={(id) => { setInstId(id); setErroInst(null) }}
                  />
                  {erroInst && <p role="alert" className={erroCls}>{erroInst}</p>}
                </fieldset>
              )}
            </section>

            <button
              type="submit"
              disabled={enviando || carregando}
              className="min-h-14 rounded-full bg-clama-night px-6 text-base font-bold text-clama-cream hover:bg-clama-night-soft disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold-soft"
            >
              {enviando ? "Enviando..." : rotuloEnvio}
            </button>
            <p className="text-center text-[13px] text-clama-night/70">
              A contribuição não muda o que pedimos por você nem promete resultado. Ela sustenta o projeto e a instituição escolhida.
            </p>
            {!usuario && (
              <Turnstile
                ref={turnstile}
                siteKey={getTurnstileSiteKey()}
                onSuccess={setToken}
                onExpire={() => setToken("")}
                onError={() => setToken("")}
                options={{ size: "invisible" }}
              />
            )}
          </form>

          <aside className="flex flex-col gap-3 self-start rounded-2xl border border-clama-cream-warm bg-white/60 p-5 lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clama-gold-soft">Seu clamor</p>
            {tema && (
              <span className="self-start rounded-full bg-clama-night px-3 py-1 text-xs font-semibold text-clama-gold">{tema.rotulo}</span>
            )}
            <blockquote className="whitespace-pre-wrap font-verse text-lg italic">{rascunho.texto}</blockquote>
            <Link to="/" className="self-start text-sm underline">Editar</Link>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}

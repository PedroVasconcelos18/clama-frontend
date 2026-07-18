import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Calendar,
  Check,
  Hourglass,
  Mail,
  CircleDollarSign,
  RefreshCw,
  TriangleAlert,
  X,
} from "lucide-react"

import { useCustomerAuth } from "@/contexts/CustomerAuthContext"
import { useCustomerApi } from "@/hooks/useCustomerApi"
import { PastoralApiError } from "@/lib/api"
import LoadingSpinner from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { PedidoSection } from "@/components/clama/PedidoSection"
import { SiteHeader } from "@/components/clama/SiteHeader"
import { buildWhatsAppShareUrl } from "@/components/clama/WhatsAppShareButton"
import { cn } from "@/lib/utils"
import type { CustomerPedido } from "@/types/pedido-customer.types"

/**
 * Área logada do customer — redesign conta-design.
 *
 * Mantém toda a lógica original: auth gate, tab em `?tab=`, fetch de pedidos
 * com debounce de filtro de data, expand da oração entregue. O visual segue os
 * mockups (clama-docs/conta-design): saudação com vela, abas integradas no
 * card, cards de pedido com coluna de data, badges de 7 estados, oração
 * expandida em forma devocional.
 *
 * Ações contextuais do mockup que dependem de backend inexistente no subset
 * seguro do customer (Finalizar pagamento → provider_checkout_url não exposto por
 * segurança; Reenviar e-mail / Tentar novamente → sem endpoint customer) são
 * substituídas pela NOTA explicativa do próprio mockup. "Compartilhar" no
 * expandido reusa `buildWhatsAppShareUrl` (lógica de share de oração existente).
 */
type TabId = "historico" | "novo"

export default function MinhaConta() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isAuthenticated, isLoading } = useCustomerAuth()

  const rawTab = searchParams.get("tab")
  const activeTab: TabId = rawTab === "novo" ? "novo" : "historico"

  const setTab = useCallback(
    (tab: TabId) => {
      const next = new URLSearchParams(searchParams)
      if (tab === "historico") next.delete("tab")
      else next.set("tab", tab)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent("/conta")}`, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleAfterLogout = useCallback(() => {
    navigate("/", { replace: true })
  }, [navigate])

  const primeiroNome = useMemo(() => {
    if (!user?.nome_completo) return "amada"
    return user.nome_completo.split(" ")[0] || "amada"
  }, [user])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clama-night">
        <LoadingSpinner size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-clama-night text-clama-cream">
      <SiteHeader active="conta" onAfterLogout={handleAfterLogout} />

      <div className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        {/* Saudação + abas integradas */}
        <section className="relative overflow-hidden rounded-3xl border border-clama-gold/20 bg-clama-night-deep">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(60% 100% at 100% 0%, rgba(240,192,64,0.13), rgba(0,0,0,0) 60%), radial-gradient(50% 80% at 0% 100%, rgba(212,160,23,0.08), rgba(0,0,0,0) 60%)",
            }}
          />
          <div className="relative px-7 pt-8 md:px-10 md:pt-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-clama-gold-soft">
                  Sua área no Clama
                </p>
                <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-clama-cream md:text-[2.6rem]">
                  Olá,{" "}
                  <span className="italic text-clama-gold">{primeiroNome}</span>.
                </h1>
                <p className="mt-3 max-w-md text-[0.9rem] leading-relaxed text-clama-cream/55">
                  Aqui ficam todos os seus clamores — os que já foram
                  respondidos, os que estão sendo escritos, e os que ainda vão
                  nascer.
                </p>
              </div>
              <span
                aria-hidden
                className="hidden shrink-0 select-none text-[2.6rem] drop-shadow-[0_0_18px_rgba(240,192,64,0.55)] sm:block"
              >
                🕯️
              </span>
            </div>

            <nav
              className="mt-7 flex items-center gap-1 border-t border-clama-gold/12 pt-1"
              role="tablist"
              aria-label="Seções da minha conta"
            >
              <TabButton
                id="historico"
                active={activeTab === "historico"}
                onClick={() => setTab("historico")}
              >
                Histórico
              </TabButton>
              <span aria-hidden className="h-1 w-1 rotate-45 bg-clama-gold/40" />
              <TabButton
                id="novo"
                active={activeTab === "novo"}
                onClick={() => setTab("novo")}
              >
                Novo pedido
              </TabButton>
            </nav>
          </div>
        </section>

        <main className="mt-8">
          {activeTab === "historico" && (
            <div role="tabpanel" id="panel-historico">
              <HistoricoTab
                onGoToNovo={() => setTab("novo")}
                primeiroNome={primeiroNome}
              />
            </div>
          )}
          {activeTab === "novo" && (
            <div role="tabpanel" id="panel-novo">
              <NovoPedidoTab />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

interface TabButtonProps {
  id: TabId
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabButton({ id, active, onClick, children }: TabButtonProps) {
  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-controls={`panel-${id}`}
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-4 py-3 font-sans text-[0.92rem] font-semibold transition-colors",
        active
          ? "border-clama-gold text-clama-gold"
          : "border-transparent text-clama-cream/55 hover:text-clama-cream",
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// HISTÓRICO
// ---------------------------------------------------------------------------

function HistoricoTab({
  onGoToNovo,
  primeiroNome,
}: {
  onGoToNovo: () => void
  primeiroNome: string
}) {
  const { customerFetch } = useCustomerApi()
  const [pedidos, setPedidos] = useState<CustomerPedido[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const loadPedidos = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams()
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const qs = params.toString()
      const url = `/api/customer/pedidos/${qs ? `?${qs}` : ""}`
      const data = await customerFetch<CustomerPedido[]>(url, {
        method: "GET",
        showToast: false,
      })
      setPedidos(data)
    } catch (err) {
      const e = err as PastoralApiError
      setError(e.pastoralMessage ?? "Não conseguimos carregar seus pedidos.")
    }
  }, [customerFetch, from, to])

  useEffect(() => {
    const t = setTimeout(() => {
      loadPedidos()
    }, 300)
    return () => clearTimeout(t)
  }, [loadPedidos])

  const limparFiltros = () => {
    setFrom("")
    setTo("")
  }

  const temFiltros = from !== "" || to !== ""

  return (
    <div>
      {/* Filtro — toolbar compacta */}
      <section
        className="rounded-2xl border border-clama-gold/15 bg-clama-night-deep px-4 py-3"
        aria-label="Filtros do histórico"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="inline-flex items-center gap-2 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-clama-gold-soft">
            <Calendar aria-hidden className="h-3.5 w-3.5" />
            Filtrar
          </span>
          <div className="flex items-center gap-2">
            <label
              htmlFor="filter-from"
              className="font-sans text-[0.78rem] text-clama-cream/55"
            >
              De
            </label>
            <input
              id="filter-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              max={to || undefined}
              className="rounded-lg border border-clama-gold/30 bg-clama-night px-3 py-1.5 text-sm text-clama-cream outline-none [color-scheme:dark] focus:border-clama-gold"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="filter-to"
              className="font-sans text-[0.78rem] text-clama-cream/55"
            >
              Até
            </label>
            <input
              id="filter-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from || undefined}
              className="rounded-lg border border-clama-gold/30 bg-clama-night px-3 py-1.5 text-sm text-clama-cream outline-none [color-scheme:dark] focus:border-clama-gold"
            />
          </div>
          <button
            type="button"
            onClick={limparFiltros}
            disabled={!temFiltros}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.12em] transition-colors",
              temFiltros
                ? "border-clama-gold/40 text-clama-gold hover:bg-clama-gold/10"
                : "cursor-default border-clama-cream/15 text-clama-cream/30",
            )}
          >
            <X aria-hidden className="h-3 w-3" />
            Limpar
          </button>
          {pedidos !== null && (
            <span className="ml-auto border-l border-clama-gold/15 pl-4 font-sans text-[0.78rem] text-clama-cream/45">
              {pedidos.length}{" "}
              {pedidos.length === 1 ? "pedido" : "pedidos"}
            </span>
          )}
        </div>
      </section>

      {error && (
        <div className="mt-6">
          <PastoralAlert variant="error">{error}</PastoralAlert>
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={loadPedidos}
              className="rounded-full border border-clama-gold/40 px-5 py-2 text-sm text-clama-cream transition-colors hover:bg-clama-gold/10"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!error && pedidos === null && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size={28} />
        </div>
      )}

      {!error && pedidos !== null && pedidos.length === 0 && (
        <EmptyState onGoToNovo={onGoToNovo} hasFilters={temFiltros} />
      )}

      {!error && pedidos !== null && pedidos.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {pedidos.map((p) => (
            <PedidoCard
              key={p.id}
              pedido={p}
              primeiroNome={primeiroNome}
              expanded={expandedId === p.id}
              onToggle={() =>
                setExpandedId((cur) => (cur === p.id ? null : p.id))
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// NOVO PEDIDO — envólucro dark (PedidoSection é compartilhado com a LP,
// então só integramos visualmente em vez de reescrevê-lo).
// ---------------------------------------------------------------------------

function NovoPedidoTab() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-clama-gold/15 bg-clama-night-deep">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-clama-gold/60 to-transparent"
      />
      <div className="border-b border-clama-gold/12 px-7 py-7 md:px-10">
        <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-clama-gold-soft">
          Um novo pedido
        </p>
        <h2 className="mt-3 font-serif text-[1.7rem] leading-tight text-clama-cream md:text-[2rem]">
          Conta o que tá no peito.{" "}
          <span className="italic text-clama-gold">A gente cuida</span> do
          resto.
        </h2>
        <p className="mt-3 max-w-lg text-[0.9rem] leading-relaxed text-clama-cream/55">
          Pode ser uma palavra só, um nome, uma data, uma cura que demora.
        </p>
      </div>
      {/*
        Variante dark isolada: PedidoSection (compartilhado com a LP) recebe
        theme="dark" — a LP continua usando o default "light", intacta.
      */}
      <PedidoSection theme="dark" />
    </section>
  )
}

// ---------------------------------------------------------------------------
// ESTADO VAZIO
// ---------------------------------------------------------------------------

function EmptyState({
  onGoToNovo,
  hasFilters,
}: {
  onGoToNovo: () => void
  hasFilters: boolean
}) {
  if (hasFilters) {
    return (
      <div className="mt-6 rounded-2xl border border-clama-gold/15 bg-clama-night-deep px-6 py-12 text-center">
        <h3 className="font-serif text-[1.2rem] text-clama-cream">
          Nenhum pedido nesse período
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-[0.9rem] leading-relaxed text-clama-cream/55">
          Tente ajustar as datas ou limpar os filtros.
        </p>
      </div>
    )
  }
  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-clama-gold/15 bg-clama-night-deep px-6 py-16 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(50% 60% at 50% 30%, rgba(240,192,64,0.08), rgba(0,0,0,0) 70%)",
        }}
      />
      <div className="relative">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-clama-gold/40 bg-clama-gold/10">
          <span className="text-2xl" role="img" aria-label="vela">
            🕯️
          </span>
        </div>
        <p className="font-sans text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-clama-gold-soft">
          Seu santuário ainda em silêncio
        </p>
        <h3 className="mt-3 font-serif text-[1.5rem] leading-tight text-clama-cream">
          Seu primeiro clamor ainda não veio.
        </h3>
        <p className="mx-auto mt-3 max-w-md text-[0.92rem] leading-relaxed text-clama-cream/55">
          Conta o que tá pesando — pode ser um luto, uma cura que demora, uma
          decisão difícil. A gente escreve uma oração só pra você.
        </p>
        <button
          type="button"
          onClick={onGoToNovo}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-clama-gold px-6 py-3 text-sm font-semibold text-clama-night transition-colors hover:bg-clama-gold-soft"
        >
          Fazer meu primeiro pedido →
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// STATUS BADGE — 7 estados, 4 tons
// ---------------------------------------------------------------------------

type Tone = "success" | "gold" | "amber" | "error"

interface StatusInfo {
  label: string
  tone: Tone
  Icon: typeof Check
  ping?: boolean
  /** Nota explicativa (substitui ações sem backend, do próprio mockup). */
  nota?: string
}

function statusToInfo(status: CustomerPedido["status"]): StatusInfo {
  switch (status) {
    case "enviada":
      return { label: "Entregue", tone: "success", Icon: Check }
    case "gerando_oracao":
    case "oracao_gerada":
      return { label: "Preparando", tone: "gold", Icon: Hourglass, ping: true }
    case "aguardando_confirmacao_email":
      return {
        label: "Aguardando e-mail",
        tone: "gold",
        Icon: Mail,
        nota: "Mandamos um link de confirmação. Abra o e-mail pra liberar seu pedido.",
      }
    case "aguardando_pagamento":
      return {
        label: "Aguardando pagamento",
        tone: "amber",
        Icon: CircleDollarSign,
        nota: "Sua oração começa assim que o pagamento for confirmado.",
      }
    case "pago":
      return { label: "Pago", tone: "success", Icon: Check }
    case "aguardando_reenvio":
      return { label: "Reenviando", tone: "gold", Icon: RefreshCw, ping: true }
    case "erro":
      return {
        label: "Tivemos um soluço",
        tone: "error",
        Icon: TriangleAlert,
        nota: "Tivemos um soluço aqui. Estamos refazendo — em breve ela chega até você.",
      }
    default:
      return { label: status, tone: "gold", Icon: Hourglass }
  }
}

const TONE_CLASSES: Record<Tone, string> = {
  success: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  gold: "border-clama-gold/45 bg-clama-gold/10 text-clama-gold",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  error: "border-red-400/40 bg-red-400/10 text-red-300",
}
const TONE_DOT: Record<Tone, string> = {
  success: "bg-emerald-300",
  gold: "bg-clama-gold",
  amber: "bg-amber-300",
  error: "bg-red-300",
}

function StatusBadge({ info }: { info: StatusInfo }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[0.64rem] font-semibold uppercase tracking-[0.12em]",
        TONE_CLASSES[info.tone],
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {info.ping && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              TONE_DOT[info.tone],
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex h-1.5 w-1.5 rounded-full",
            TONE_DOT[info.tone],
          )}
        />
      </span>
      {info.label}
      <info.Icon aria-hidden className="h-3 w-3" />
    </span>
  )
}

// ---------------------------------------------------------------------------
// PEDIDO CARD
// ---------------------------------------------------------------------------

function PedidoCard({
  pedido,
  primeiroNome,
  expanded,
  onToggle,
}: {
  pedido: CustomerPedido
  primeiroNome: string
  expanded: boolean
  onToggle: () => void
}) {
  const dt = useMemo(() => new Date(pedido.created_at), [pedido.created_at])
  const dia = dt.toLocaleDateString("pt-BR", { day: "2-digit" })
  const mes = dt
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase()
  const ano = dt.toLocaleDateString("pt-BR", { year: "numeric" })
  const dataExtenso = dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const info = useMemo(() => statusToInfo(pedido.status), [pedido.status])
  const canalLabel = pedido.canal_entrega === "whatsapp" ? "WhatsApp" : "E-mail"
  const titulo = pedido.eh_gratuito
    ? "Oração gratuita"
    : pedido.plano || "Oração"
  const podeExpandir = pedido.status === "enviada" && !!pedido.oracao_gerada

  return (
    <article className="overflow-hidden rounded-2xl border border-clama-gold/15 bg-clama-night-deep transition-colors hover:border-clama-gold/25">
      <button
        type="button"
        onClick={podeExpandir ? onToggle : undefined}
        aria-expanded={expanded}
        className={cn(
          "flex w-full gap-5 p-5 text-left transition-colors",
          podeExpandir ? "cursor-pointer hover:bg-clama-night/40" : "cursor-default",
        )}
      >
        {/* Coluna data */}
        <div className="flex w-12 shrink-0 flex-col items-center pt-1 text-center">
          <span className="font-serif text-2xl leading-none text-clama-cream">
            {dia}
          </span>
          <span className="mt-1 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-clama-gold-soft">
            {mes}
          </span>
          <span className="mt-0.5 font-sans text-[0.6rem] text-clama-cream/35">
            {ano}
          </span>
        </div>

        {/* Centro */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <h3 className="font-serif text-[1.1rem] leading-tight text-clama-cream">
                {titulo}
              </h3>
              <p className="mt-1 font-sans text-[0.78rem] text-clama-cream/50">
                {!pedido.eh_gratuito && pedido.valor_reais_str
                  ? `${pedido.valor_reais_str} · `
                  : ""}
                {canalLabel}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <StatusBadge info={info} />
              {podeExpandir && (
                <span className="font-sans text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-clama-gold/80">
                  {expanded ? "Recolher ▴" : "Ver oração ▾"}
                </span>
              )}
            </div>
          </div>

          {info.nota && (
            <p className="mt-3 flex gap-2 border-l-2 border-clama-gold/30 pl-3 font-sans text-[0.8rem] leading-relaxed text-clama-cream/55">
              {info.nota}
            </p>
          )}
        </div>
      </button>

      {podeExpandir && expanded && pedido.oracao_gerada && (
        <OracaoExpandida
          texto={pedido.oracao_gerada}
          dataExtenso={dataExtenso}
          canalLabel={canalLabel}
          primeiroNome={primeiroNome}
        />
      )}
    </article>
  )
}

function OracaoExpandida({
  texto,
  dataExtenso,
  canalLabel,
  primeiroNome,
}: {
  texto: string
  dataExtenso: string
  canalLabel: string
  primeiroNome: string
}) {
  return (
    <div className="relative border-t border-clama-gold/15 bg-clama-night/40 px-6 py-8 md:px-10 md:py-10">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 0%, rgba(240,192,64,0.08), rgba(0,0,0,0) 70%)",
        }}
      />
      <div className="relative mx-auto max-w-xl text-center">
        <p className="font-sans text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-clama-gold-soft">
          Sua oração · {dataExtenso}
        </p>
        <h4 className="mt-3 font-serif text-2xl text-clama-cream">
          Para {primeiroNome}
        </h4>
        <p className="mt-6 whitespace-pre-line text-left font-serif text-[1.02rem] leading-[1.75] text-clama-cream/90">
          {texto}
        </p>
        <div
          aria-hidden
          className="my-7 flex items-center justify-center gap-3"
        >
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-clama-gold/30" />
          <span className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-clama-gold-soft">
            Amém
          </span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-clama-gold/30" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-sans text-[0.76rem] text-clama-cream/45">
          <span>Entregue por {canalLabel}</span>
          <a
            href={buildWhatsAppShareUrl(texto)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-clama-gold/35 px-3 py-1.5 font-semibold text-clama-gold transition-colors hover:bg-clama-gold/10"
          >
            Compartilhar
          </a>
        </div>
      </div>
    </div>
  )
}

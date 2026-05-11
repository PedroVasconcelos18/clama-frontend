import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { useCustomerAuth } from "@/contexts/CustomerAuthContext"
import { useCustomerApi } from "@/hooks/useCustomerApi"
import { PastoralApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import LoadingSpinner from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { PedidoSection } from "@/components/clama/PedidoSection"
import type { CustomerPedido } from "@/types/pedido-customer.types"

/**
 * Área logada do customer (G2.c).
 *
 * Duas tabs:
 * - **Histórico**: lista pedidos do user, com filtro opcional de data
 *   (`from`/`to`). Backend filtra por `request.user` (claim JWT) — user
 *   nunca vê pedidos de outro.
 * - **Novo pedido**: monta o `PedidoSection` (form pago) inline na própria
 *   área logada, sem voltar pra LP. Após login, o submit aproveita o JWT
 *   pra `POST /api/pedidos/` direto, sem paywall intermediário.
 *
 * Estado da tab vive em `?tab=historico|novo` — preserva via deep link e
 * refresh.
 */
type TabId = "historico" | "novo"

export default function MinhaConta() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isAuthenticated, isLoading, logout } = useCustomerAuth()

  // Tab persistida em querystring. Default = histórico.
  const rawTab = searchParams.get("tab")
  const activeTab: TabId = rawTab === "novo" ? "novo" : "historico"

  const setTab = useCallback(
    (tab: TabId) => {
      const next = new URLSearchParams(searchParams)
      if (tab === "historico") {
        next.delete("tab")
      } else {
        next.set("tab", tab)
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  // Redirect anon pra login (com next=/conta pra voltar após autenticar)
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent("/conta")}`, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleLogout = useCallback(async () => {
    await logout()
    toast.success("Até logo. Que sua paz seja preservada.")
    navigate("/", { replace: true })
  }, [logout, navigate])

  const primeiroNome = useMemo(() => {
    if (!user?.nome_completo) return "amada"
    return user.nome_completo.split(" ")[0]
  }, [user])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-clama-night flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-clama-night text-clama-cream">
      {/* Header */}
      <header className="border-b border-clama-gold/20">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            to="/"
            className="font-serif text-clama-gold text-[1.4rem] font-bold tracking-wide"
          >
            Clama
          </Link>
          <button
            onClick={handleLogout}
            className="font-sans text-[0.82rem] text-clama-cream/70 hover:text-clama-gold transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Saudação */}
      <section className="max-w-3xl mx-auto px-6 pt-12 pb-6 text-center">
        <p className="font-sans text-[0.78rem] tracking-[2px] uppercase text-clama-gold mb-2">
          Sua área no Clama
        </p>
        <h1 className="font-serif text-[1.8rem] md:text-[2.2rem] text-clama-cream leading-tight">
          Paz e bem, {primeiroNome}.
        </h1>
      </section>

      {/* Tabs */}
      <nav
        className="max-w-3xl mx-auto px-6"
        role="tablist"
        aria-label="Seções da minha conta"
      >
        <div className="flex gap-1 border-b border-clama-gold/15">
          <TabButton
            id="historico"
            active={activeTab === "historico"}
            onClick={() => setTab("historico")}
          >
            Histórico
          </TabButton>
          <TabButton
            id="novo"
            active={activeTab === "novo"}
            onClick={() => setTab("novo")}
          >
            Novo pedido
          </TabButton>
        </div>
      </nav>

      {/* Tab content */}
      <main className="max-w-3xl mx-auto px-6 pb-16 pt-8">
        {activeTab === "historico" && (
          <div role="tabpanel" id="panel-historico">
            <HistoricoTab onGoToNovo={() => setTab("novo")} />
          </div>
        )}
        {activeTab === "novo" && (
          <div role="tabpanel" id="panel-novo">
            <NovoPedidoTab />
          </div>
        )}
      </main>
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
      className={`font-sans font-semibold text-[0.92rem] px-5 py-3 transition-colors border-b-2 -mb-px ${
        active
          ? "border-clama-gold text-clama-gold"
          : "border-transparent text-clama-cream/60 hover:text-clama-cream"
      }`}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// HISTÓRICO TAB
// ---------------------------------------------------------------------------

interface HistoricoTabProps {
  onGoToNovo: () => void
}

function HistoricoTab({ onGoToNovo }: HistoricoTabProps) {
  const { customerFetch } = useCustomerApi()
  const [pedidos, setPedidos] = useState<CustomerPedido[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filtros — controlled inputs, debounce no fetch
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")

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

  // Debounce fetch quando filtros mudam (300ms — input type=date só dispara
  // change em datas completas, então não há disparo por tecla individual,
  // mas o debounce ajuda quando user limpa ambos os campos rapidamente).
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
      {/* Filtro de data */}
      <section
        className="border border-clama-gold/15 bg-clama-night-deep rounded-clama-card p-4 mb-6"
        aria-label="Filtros do histórico"
      >
        <p className="font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-clama-gold mb-3">
          Filtrar por data
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label
              htmlFor="filter-from"
              className="block font-sans text-[0.78rem] text-clama-cream/70 mb-1"
            >
              De
            </label>
            <input
              id="filter-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              max={to || undefined}
              className="w-full bg-clama-night border border-clama-gold/30 text-clama-cream text-sm rounded-lg px-3 py-2 outline-none focus:border-clama-gold"
            />
          </div>
          <div>
            <label
              htmlFor="filter-to"
              className="block font-sans text-[0.78rem] text-clama-cream/70 mb-1"
            >
              Até
            </label>
            <input
              id="filter-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from || undefined}
              className="w-full bg-clama-night border border-clama-gold/30 text-clama-cream text-sm rounded-lg px-3 py-2 outline-none focus:border-clama-gold"
            />
          </div>
          <Button
            variant="outline"
            onClick={limparFiltros}
            disabled={!temFiltros}
            className="h-10 border-clama-gold/40 text-clama-cream hover:bg-clama-gold/10 disabled:opacity-40"
          >
            Limpar
          </Button>
        </div>
      </section>

      {error && (
        <div className="mb-6">
          <PastoralAlert variant="error">{error}</PastoralAlert>
          <div className="mt-3 text-center">
            <Button variant="outline" onClick={loadPedidos}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {!error && pedidos === null && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size={28} />
        </div>
      )}

      {!error && pedidos !== null && pedidos.length === 0 && (
        <EmptyState onGoToNovo={onGoToNovo} hasFilters={temFiltros} />
      )}

      {!error && pedidos !== null && pedidos.length > 0 && (
        <div className="space-y-4">
          {pedidos.map((p) => (
            <PedidoCard
              key={p.id}
              pedido={p}
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
// NOVO PEDIDO TAB
// ---------------------------------------------------------------------------

function NovoPedidoTab() {
  // O PedidoSection já gerencia tudo: form, plano, canal, paywall (não dispara
  // aqui porque o user está autenticado), checkout. Reusamos o componente
  // standalone — não precisa de ref (não há scroll-into-view dentro da
  // própria página de conta).
  return (
    <div className="bg-white rounded-clama-card overflow-hidden border border-clama-gold/15">
      <PedidoSection />
    </div>
  )
}

// ---------------------------------------------------------------------------
// EMPTY STATE
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  onGoToNovo: () => void
  hasFilters: boolean
}

function EmptyState({ onGoToNovo, hasFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="border border-clama-gold/20 rounded-clama-card bg-clama-night-deep p-8 text-center">
        <h3 className="font-serif text-[1.1rem] text-clama-cream mb-2">
          Nenhum pedido nesse período
        </h3>
        <p className="font-sans text-[0.9rem] text-clama-cream/70 leading-relaxed">
          Tente ajustar as datas ou limpar os filtros.
        </p>
      </div>
    )
  }
  return (
    <div className="border border-clama-gold/20 rounded-clama-card bg-clama-night-deep p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-clama-gold/10 border border-clama-gold/40 flex items-center justify-center mx-auto mb-4">
        <span className="text-[1.6rem]" role="img" aria-label="vela">
          🕯️
        </span>
      </div>
      <h3 className="font-serif text-[1.2rem] text-clama-cream mb-2">
        Seu primeiro clamor ainda não veio
      </h3>
      <p className="font-sans text-[0.9rem] text-clama-cream/70 leading-relaxed mb-5">
        Tudo o que está no seu coração tem espaço aqui. Comece agora.
      </p>
      <Button
        variant="gold"
        onClick={onGoToNovo}
        className="rounded-full px-6 h-10 text-[0.95rem] font-bold"
      >
        Fazer meu primeiro pedido
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PEDIDO CARD
// ---------------------------------------------------------------------------

interface PedidoCardProps {
  pedido: CustomerPedido
  expanded: boolean
  onToggle: () => void
}

function PedidoCard({ pedido, expanded, onToggle }: PedidoCardProps) {
  const data = useMemo(
    () =>
      new Date(pedido.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    [pedido.created_at],
  )

  const statusInfo = useMemo(() => statusToInfo(pedido.status), [pedido.status])
  const canalLabel = pedido.canal_entrega === "whatsapp" ? "WhatsApp" : "E-mail"

  const podeExpandir = pedido.status === "enviada" && !!pedido.oracao_gerada

  return (
    <article className="border border-clama-gold/20 rounded-clama-card bg-clama-night-deep overflow-hidden">
      <button
        type="button"
        onClick={podeExpandir ? onToggle : undefined}
        className={`w-full text-left p-5 transition-colors ${
          podeExpandir ? "hover:bg-clama-night/50 cursor-pointer" : "cursor-default"
        }`}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="font-sans text-[0.78rem] tracking-[1px] uppercase text-clama-gold">
              {data}
            </p>
            <p className="font-serif text-[1.05rem] text-clama-cream mt-1">
              {pedido.eh_gratuito ? "Oração gratuita" : pedido.plano || "Oração"}
            </p>
          </div>
          <span
            className={`font-sans text-[0.72rem] font-semibold tracking-[1px] uppercase px-3 py-1 rounded-full border ${statusInfo.classes}`}
          >
            {statusInfo.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-clama-cream/70 font-sans text-[0.82rem]">
          <span>Entrega: {canalLabel}</span>
          {!pedido.eh_gratuito && pedido.valor_reais_str && (
            <span>Valor: {pedido.valor_reais_str}</span>
          )}
          {podeExpandir && (
            <span className="ml-auto text-clama-gold/80">
              {expanded ? "Recolher ▴" : "Ver oração ▾"}
            </span>
          )}
        </div>
      </button>

      {podeExpandir && expanded && (
        <div className="border-t border-clama-gold/15 px-5 py-5 bg-clama-night/40">
          <p className="font-serif text-[0.95rem] leading-relaxed text-clama-cream whitespace-pre-line">
            {pedido.oracao_gerada}
          </p>
        </div>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------

interface StatusInfo {
  label: string
  classes: string
}

function statusToInfo(status: CustomerPedido["status"]): StatusInfo {
  switch (status) {
    case "enviada":
      return {
        label: "Entregue",
        classes: "border-emerald-400/50 text-emerald-300",
      }
    case "gerando_oracao":
    case "oracao_gerada":
      return {
        label: "Preparando",
        classes: "border-clama-gold/60 text-clama-gold",
      }
    case "aguardando_confirmacao_email":
      return {
        label: "Aguardando e-mail",
        classes: "border-clama-gold/60 text-clama-gold",
      }
    case "aguardando_pagamento":
      return {
        label: "Aguardando pagamento",
        classes: "border-amber-400/50 text-amber-300",
      }
    case "pago":
      return {
        label: "Pago",
        classes: "border-emerald-400/50 text-emerald-300",
      }
    case "aguardando_reenvio":
      return {
        label: "Reenviando",
        classes: "border-clama-gold/60 text-clama-gold",
      }
    case "erro":
      return {
        label: "Tivemos um soluço",
        classes: "border-red-400/50 text-red-300",
      }
    default:
      return {
        label: status,
        classes: "border-clama-cream/30 text-clama-cream/70",
      }
  }
}

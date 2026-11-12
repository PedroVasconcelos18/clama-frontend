import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ListChecks } from "lucide-react"

import { useApi } from "@/hooks/useApi"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { formatCurrency } from "@/lib/formatters"
import type { components } from "@/types/api-schema"

type Tarefa = components["schemas"]["Tarefa"]
type Pedidos = components["schemas"]["ResumoDePedidos"]
type Oracao = components["schemas"]["ResumoDaOracao"]

const CARTAO = "bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-4"
const ROTULO = "text-xs uppercase tracking-wider text-clama-gold/80"
const hojeEmSp = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })

const numero = (n?: number | null) => (n == null ? "—" : n.toLocaleString("pt-BR"))
const segundos = (s?: number | null) => (s == null ? "—" : s < 60 ? `${Math.round(s)} s` : `${(s / 60).toFixed(1).replace(".", ",")} min`)
const milissegundos = (ms?: number | null) => (ms == null ? "—" : `${(ms / 1000).toFixed(1).replace(".", ",")} s`)
/** Custo nulo = algum modelo do período sem preço configurado: mostra "—", nunca zero. */
const dolares = (v?: number | null) => (v == null ? "—" : `US$ ${v.toFixed(4)}`)

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className={CARTAO}>
      <div className="text-clama-cream/60 text-sm mb-2">{titulo}</div>
      <div className="text-xl font-semibold text-clama-cream">{children}</div>
    </div>
  )
}

/** Cartões de tarefas (7a) e de métricas de pedido e de oração (7b), no período escolhido (padrão: mês corrente, em São Paulo). */
export default function DashboardPage() {
  const { fetchApi } = useApi()
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [ate, setAte] = useState(hojeEmSp)
  const [de, setDe] = useState(() => `${hojeEmSp().slice(0, 8)}01`)
  const [pedidos, setPedidos] = useState<Pedidos | null>(null)
  const [oracao, setOracao] = useState<Oracao | null>(null)
  const [erroMetricas, setErroMetricas] = useState(false)

  useEffect(() => {
    fetchApi<Tarefa[]>("/api/admin/tarefas", { showToast: false })
      .then(setTarefas)
      .catch(() => setFalhou(true))
  }, [fetchApi])

  useEffect(() => {
    if (!de || !ate) return
    let cancelado = false
    const query = `?de=${de}&ate=${ate}`
    Promise.all([
      fetchApi<Pedidos>(`/api/admin/metricas/pedidos${query}`, { showToast: false }),
      fetchApi<Oracao>(`/api/admin/metricas/oracao${query}`, { showToast: false }),
    ])
      .then(([p, o]) => {
        if (cancelado) return
        setErroMetricas(false)
        setPedidos(p)
        setOracao(o)
      })
      .catch(() => !cancelado && setErroMetricas(true))
    return () => {
      cancelado = true
    }
  }, [fetchApi, de, ate])

  const problemas = tarefas?.filter((t) => t.situacao !== "ok").length ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif text-clama-gold">Dashboard</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="dash-de" className={ROTULO}>De</Label>
          <Input id="dash-de" type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="dash-ate" className={ROTULO}>Até</Label>
          <Input id="dash-ate" type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} />
        </div>
      </div>

      {erroMetricas ? (
        <p className="text-sm text-red-300">Não foi possível ler as métricas.</p>
      ) : !pedidos || !oracao ? (
        <LoadingSpinner size={20} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Cartao titulo="Pagos">{numero(pedidos.pagos)}</Cartao>
            <Cartao titulo="Gratuitos">{numero(pedidos.gratuitos)}</Cartao>
            <Cartao titulo="Faturamento">{formatCurrency(pedidos.faturamentoCentavos ?? 0)}</Cartao>
            <Cartao titulo="Ticket médio">{formatCurrency(pedidos.ticketMedioCentavos ?? 0)}</Cartao>
            <Cartao titulo="Criados">{numero(pedidos.criados)}</Cartao>
            <Cartao titulo="Enviados">{numero(pedidos.enviados)}</Cartao>
            <Cartao titulo="Em erro agora">
              <Link
                to="/admin/pedidos?status=ERRO"
                className={(pedidos.emErroAgora ?? 0) > 0 ? "text-red-300" : undefined}
                aria-label={`Em erro agora: ${numero(pedidos.emErroAgora)}`}
              >
                {numero(pedidos.emErroAgora)}
              </Link>
            </Cartao>
            <Cartao titulo="Latência do pedido (p50 / p90)">
              {segundos(pedidos.latencia?.p50Segundos)} / {segundos(pedidos.latencia?.p90Segundos)}
            </Cartao>
          </div>

          <section aria-label="Por plano" className={CARTAO}>
            <h2 className={ROTULO}>Por plano (só pagos)</h2>
            {pedidos.porPlano?.length ? (
              <ul className="mt-2 space-y-1 text-sm text-clama-cream">
                {pedidos.porPlano.map((pl) => (
                  <li key={pl.plano}>
                    {pl.plano}: {numero(pl.quantidade)} · {formatCurrency(pl.faturamentoCentavos ?? 0)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-clama-cream/60">Nenhum pedido pago no período.</p>
            )}
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Cartao titulo="Orações geradas">{numero(oracao.geracoes)}</Cartao>
            <Cartao titulo="Tokens (entrada / saída)">
              {numero(oracao.tokensEntrada)} / {numero(oracao.tokensSaida)}
            </Cartao>
            <Cartao titulo="Tokens de cache (escrita / leitura)">
              {numero(oracao.tokensCacheEscrita)} / {numero(oracao.tokensCacheLeitura)}
            </Cartao>
            <Cartao titulo="Custo estimado">{dolares(oracao.custoEstimadoUsd)}</Cartao>
            <Cartao titulo="Duração da geração (p50 / p90)">
              {milissegundos(oracao.duracao?.p50Ms)} / {milissegundos(oracao.duracao?.p90Ms)}
            </Cartao>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={CARTAO}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-clama-gold/10 rounded-lg">
              <ListChecks className="w-5 h-5 text-clama-gold" />
            </div>
            <span className="text-clama-cream/60 text-sm">Tarefas</span>
          </div>
          {falhou ? (
            <p className="text-sm text-red-300">Não foi possível ler as tarefas.</p>
          ) : !tarefas ? (
            <LoadingSpinner size={20} />
          ) : problemas === 0 ? (
            <Link to="/admin/tarefas" className="text-lg text-clama-cream">Tarefas: tudo em dia</Link>
          ) : (
            <Link to="/admin/tarefas" className="text-lg font-semibold text-red-300">
              Tarefas: {problemas} {problemas === 1 ? "com problema" : "com problemas"}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

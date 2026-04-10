import { useState, useEffect } from "react"
import { useAdminApi } from "@/hooks/useAdminApi"
import { PastoralApiError } from "@/lib/api"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertTriangle, DollarSign, FileText, PieChart } from "lucide-react"

interface OverviewMetrics {
  periodo: string
  total_pedidos: number
  pedidos_pagos: number
  pedidos_enviados: number
  faturamento_centavos: number
  faturamento_reais_str: string
  ticket_medio_centavos: number
  ticket_medio_reais_str: string
  alertas_erro: Array<{
    id: string
    nome: string
    email: string
    status: string
    created_at: string
  }>
}

interface DistributionMetrics {
  periodo: string
  por_plano: Array<{ plano: string; count: number; percentual: number }>
  por_canal: Array<{ canal: string; count: number; percentual: number }>
  por_status: Array<{ status: string; count: number; percentual: number }>
}

type Period = "day" | "week" | "month"

export default function DashboardPage() {
  const { adminFetch } = useAdminApi()
  const [period, setPeriod] = useState<Period>("month")
  const [overview, setOverview] = useState<OverviewMetrics | null>(null)
  const [distribution, setDistribution] = useState<DistributionMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMetrics() {
      setIsLoading(true)
      setError(null)

      try {
        const [overviewData, distributionData] = await Promise.all([
          adminFetch<OverviewMetrics>(`/api/admin/metrics/overview/?period=${period}`),
          adminFetch<DistributionMetrics>(`/api/admin/metrics/distribution/?period=${period}`),
        ])
        setOverview(overviewData)
        setDistribution(distributionData)
      } catch (err) {
        if (err instanceof PastoralApiError) {
          setError(err.pastoralMessage)
        } else {
          setError("Erro ao carregar métricas.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadMetrics()
  }, [adminFetch, period])

  const periodLabels: Record<Period, string> = {
    day: "Dia",
    week: "Semana",
    month: "Mês",
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner className="text-clama-gold" />
      </div>
    )
  }

  if (error) {
    return <PastoralAlert variant="error">{error}</PastoralAlert>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-serif text-clama-gold">Dashboard</h1>
        <div className="flex gap-2">
          {(["day", "week", "month"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p)}
              className={cn(
                period !== p && "text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10"
              )}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pedidos */}
        <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-clama-gold/10 rounded-lg">
              <FileText className="w-5 h-5 text-clama-gold" />
            </div>
            <span className="text-clama-cream/60 text-sm">Pedidos</span>
          </div>
          <p className="text-3xl font-semibold text-clama-cream">{overview?.total_pedidos ?? 0}</p>
          <p className="text-sm text-clama-cream/50 mt-1">
            {overview?.pedidos_pagos ?? 0} pagos / {overview?.pedidos_enviados ?? 0} enviados
          </p>
        </div>

        {/* Faturamento */}
        <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-clama-gold/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-clama-gold" />
            </div>
            <span className="text-clama-cream/60 text-sm">Faturamento</span>
          </div>
          <p className="text-3xl font-semibold text-clama-cream">
            {overview?.faturamento_reais_str ?? "R$ 0,00"}
          </p>
          <p className="text-sm text-clama-cream/50 mt-1">
            Ticket médio: {overview?.ticket_medio_reais_str ?? "R$ 0,00"}
          </p>
        </div>

        {/* Distribuição por Plano */}
        <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-clama-gold/10 rounded-lg">
              <PieChart className="w-5 h-5 text-clama-gold" />
            </div>
            <span className="text-clama-cream/60 text-sm">Por Plano</span>
          </div>
          <div className="space-y-2">
            {distribution?.por_plano?.slice(0, 3).map((item) => (
              <div key={item.plano} className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-clama-night rounded-full overflow-hidden">
                  <div
                    className="h-full bg-clama-gold"
                    style={{ width: `${item.percentual}%` }}
                  />
                </div>
                <span className="text-xs text-clama-cream/60 w-16 text-right">
                  {item.plano.slice(0, 8)}
                </span>
                <span className="text-xs text-clama-cream/80 w-10 text-right">
                  {item.percentual}%
                </span>
              </div>
            ))}
            {(!distribution?.por_plano || distribution.por_plano.length === 0) && (
              <p className="text-sm text-clama-cream/40">Sem dados</p>
            )}
          </div>
        </div>

        {/* Distribuição por Canal */}
        <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-clama-gold/10 rounded-lg">
              <PieChart className="w-5 h-5 text-clama-gold" />
            </div>
            <span className="text-clama-cream/60 text-sm">Por Canal</span>
          </div>
          <div className="space-y-2">
            {distribution?.por_canal?.map((item) => (
              <div key={item.canal} className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-clama-night rounded-full overflow-hidden">
                  <div
                    className="h-full bg-clama-accent"
                    style={{ width: `${item.percentual}%` }}
                  />
                </div>
                <span className="text-xs text-clama-cream/60 w-16 text-right">{item.canal}</span>
                <span className="text-xs text-clama-cream/80 w-10 text-right">
                  {item.percentual}%
                </span>
              </div>
            ))}
            {(!distribution?.por_canal || distribution.por_canal.length === 0) && (
              <p className="text-sm text-clama-cream/40">Sem dados</p>
            )}
          </div>
        </div>
      </div>

      {/* Alertas de Erro */}
      <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-lg font-medium text-clama-cream">Alertas</h2>
        </div>

        {overview?.alertas_erro && overview.alertas_erro.length > 0 ? (
          <div className="space-y-2">
            {overview.alertas_erro.map((alerta) => (
              <div
                key={alerta.id}
                className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg"
              >
                <div>
                  <p className="text-clama-cream font-medium">{alerta.nome}</p>
                  <p className="text-sm text-clama-cream/60">{alerta.email}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">
                    {alerta.status}
                  </span>
                  <p className="text-xs text-clama-cream/40 mt-1">
                    {new Date(alerta.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-clama-cream/60 text-center py-4">
            Nenhum alerta pendente. Tudo em ordem.
          </p>
        )}
      </div>
    </div>
  )
}

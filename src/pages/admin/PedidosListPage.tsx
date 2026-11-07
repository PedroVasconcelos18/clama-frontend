import { useEffect, useState } from "react"
import { useAdminList } from "@/hooks/useAdminList"
import { AdminPager } from "@/components/admin/AdminPager"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PedidoDetailDrawer } from "@/components/admin/PedidoDetailDrawer"
import { PEDIDO_STATUS, PEDIDO_STATUS_COLORS as STATUS_COLORS } from "@/lib/pedido-status"
import { cn } from "@/lib/utils"
import { ArrowUpDown, Search, Eye } from "lucide-react"
import type { AdminPedidoListItem } from "@/types/admin.types"

const SELECT =
  "h-9 px-3 rounded-lg bg-clama-night border border-clama-gold/30 text-clama-cream text-sm focus:outline-none focus:border-clama-gold"

export default function PedidosListPage() {
  const [q, setQ] = useState("")
  const [qBusca, setQBusca] = useState("") // q já com debounce: a busca do back decifra pedidos sem conta
  const [status, setStatus] = useState("")
  const [canal, setCanal] = useState("")
  const [ordering, setOrdering] = useState("") // "" = padrão do back (mais novo primeiro)
  const [offset, setOffset] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null)

  const { data, loading: isLoading, error } = useAdminList<AdminPedidoListItem>(
    "/api/admin/pedidos/",
    { q: qBusca, status, canal, ordering },
    offset,
    reloadToken,
  )
  const pedidos = data?.results ?? []
  const totalCount = data?.count ?? 0

  useEffect(() => {
    if (q === qBusca) return
    const t = setTimeout(() => {
      setQBusca(q)
      setOffset(0)
    }, 300)
    return () => clearTimeout(t)
  }, [q, qBusca])

  // qualquer mudança de filtro volta à primeira página
  const filtro = (set: (v: string) => void) => (v: string) => {
    set(v)
    setOffset(0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-serif text-clama-gold">Pedidos</h1>
        <span className="text-sm text-clama-cream/60">{totalCount} no total</span>
      </div>

      <div className="flex flex-wrap gap-3 items-start">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clama-cream/40" />
            <Input
              aria-label="Buscar pedidos"
              placeholder="E-mail ou nome da conta, ou início do ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-clama-night border-clama-gold/30 text-clama-cream placeholder:text-clama-cream/40"
            />
          </div>
          <p className="mt-1 text-xs text-clama-cream/50">
            Pedido com conta é achado pelo e-mail/nome da conta, não pelos do pedido. Nome e e-mail do próprio pedido
            só valem na busca quando ele não tem conta.
          </p>
        </div>

        <select
          aria-label="Status"
          value={status}
          onChange={(e) => filtro(setStatus)(e.target.value)}
          className={SELECT}
        >
          <option value="">Todos os status</option>
          {PEDIDO_STATUS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Canal"
          value={canal}
          onChange={(e) => filtro(setCanal)(e.target.value)}
          className={SELECT}
        >
          <option value="">Todos os canais</option>
          <option value="email">E-mail</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>

      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}

      {/* Table */}
      <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-clama-gold/20">
                <th className="px-4 py-3 text-left text-xs font-medium text-clama-cream/60 uppercase tracking-wide">
                  <button
                    onClick={() => filtro(setOrdering)(ordering === "created_at" ? "" : "created_at")}
                    className="flex items-center gap-1 hover:text-clama-cream"
                  >
                    Data
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-clama-cream/60 uppercase tracking-wide">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-clama-cream/60 uppercase tracking-wide hidden md:table-cell">
                  E-mail
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-clama-cream/60 uppercase tracking-wide hidden lg:table-cell">
                  Plano
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-clama-cream/60 uppercase tracking-wide">
                  Valor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-clama-cream/60 uppercase tracking-wide hidden sm:table-cell">
                  Canal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-clama-cream/60 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-clama-cream/60 uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <LoadingSpinner className="text-clama-gold mx-auto" />
                  </td>
                </tr>
              ) : pedidos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-clama-cream/60">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                pedidos.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className="border-b border-clama-gold/10 hover:bg-clama-gold/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-clama-cream/80">
                      {new Date(pedido.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-sm text-clama-cream font-medium">
                      {pedido.nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-clama-cream/70 hidden md:table-cell">
                      {pedido.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-clama-cream/70 hidden lg:table-cell">
                      {pedido.plano_nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-clama-cream/80">
                      {pedido.valor_reais_str}
                    </td>
                    <td className="px-4 py-3 text-sm text-clama-cream/70 hidden sm:table-cell capitalize">
                      {pedido.canal_entrega}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block px-2 py-1 text-xs rounded",
                          STATUS_COLORS[pedido.status] || "bg-gray-500/20 text-gray-400"
                        )}
                      >
                        {pedido.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Ver pedido"
                        onClick={() => setSelectedPedidoId(pedido.id)}
                        className="text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      <AdminPager offset={offset} total={totalCount} onChange={setOffset} />

      {/* Detail Drawer */}
      <PedidoDetailDrawer
        pedidoId={selectedPedidoId}
        onClose={() => setSelectedPedidoId(null)}
        onChanged={() => setReloadToken((n) => n + 1)}
      />
    </div>
  )
}

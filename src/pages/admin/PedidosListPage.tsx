import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { usePaginaAdmin } from "@/hooks/useAdminList"
import { AdminPager } from "@/components/admin/AdminPager"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PedidoDetailDrawer } from "@/components/admin/PedidoDetailDrawer"
import { PEDIDO_STATUS, PEDIDO_STATUS_COLORS as STATUS_COLORS, rotuloDoStatus } from "@/lib/pedido-status"
import { formatarData } from "@/lib/datetime"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { Search, Eye } from "lucide-react"
import type { AdminPedidoItem } from "@/types/admin.types"

const SELECT =
  "mt-1 block h-9 px-3 rounded-lg bg-clama-night border border-clama-gold/30 text-clama-cream text-sm focus:outline-none focus:border-clama-gold"
const ROTULO = "text-xs uppercase tracking-wider text-clama-gold/80"
const TH = "px-4 py-3 text-left text-xs font-medium text-clama-cream/60 uppercase tracking-wide"

/** Pedidos (PagedModel, mais novo primeiro). `?id=` abre o detalhe: é o link do alerta ao admin (D11). */
export default function PedidosListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState("")
  const [qBusca, setQBusca] = useState("") // q com debounce
  const [status, setStatus] = useState("")
  const [de, setDe] = useState("")
  const [ate, setAte] = useState("")
  const [gratuito, setGratuito] = useState("")
  const [offset, setOffset] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(searchParams.get("id"))

  const { data, loading: isLoading, error } = usePaginaAdmin<AdminPedidoItem>(
    "/api/admin/pedidos",
    { q: qBusca, status, de, ate, gratuito },
    offset,
    reloadToken,
  )
  const pedidos = data?.content ?? []
  const totalCount = data?.page.totalElements ?? 0

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

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clama-cream/40" />
            <Input
              aria-label="Buscar pedidos"
              placeholder="E-mail, CPF/CNPJ ou início do id"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-clama-night border-clama-gold/30 text-clama-cream placeholder:text-clama-cream/40"
            />
          </div>
          <p className="mt-1 text-xs text-clama-cream/50">
            Busque pelo e-mail exato, pelo CPF/CNPJ exato ou pelo começo do id do pedido. Nome não entra na busca
            (é cifrado).
          </p>
        </div>

        <div>
          <Label htmlFor="ped-status" className={ROTULO}>Status</Label>
          <select id="ped-status" value={status} onChange={(e) => filtro(setStatus)(e.target.value)} className={SELECT}>
            <option value="">Todos</option>
            {PEDIDO_STATUS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="ped-de" className={ROTULO}>De</Label>
          <input id="ped-de" type="date" value={de} max={ate || undefined}
            onChange={(e) => filtro(setDe)(e.target.value)} className={cn(SELECT, "[color-scheme:dark]")} />
        </div>
        <div>
          <Label htmlFor="ped-ate" className={ROTULO}>Até</Label>
          <input id="ped-ate" type="date" value={ate} min={de || undefined}
            onChange={(e) => filtro(setAte)(e.target.value)} className={cn(SELECT, "[color-scheme:dark]")} />
        </div>
        <div>
          <Label htmlFor="ped-gratuito" className={ROTULO}>Gratuito</Label>
          <select id="ped-gratuito" value={gratuito} onChange={(e) => filtro(setGratuito)(e.target.value)} className={SELECT}>
            <option value="">Todos</option>
            <option value="true">Só gratuitos</option>
            <option value="false">Só pagos</option>
          </select>
        </div>
      </div>

      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}

      <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-clama-gold/20">
                <th className={TH}>Id</th>
                <th className={TH}>Nome</th>
                <th className={cn(TH, "hidden md:table-cell")}>E-mail</th>
                <th className={TH}>Status</th>
                <th className={TH}>Valor</th>
                <th className={cn(TH, "hidden lg:table-cell")}>Plano</th>
                <th className={TH}>Data</th>
                <th className={cn(TH, "text-right")}>Ações</th>
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
                  <tr key={pedido.id} className="border-b border-clama-gold/10 hover:bg-clama-gold/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-clama-cream/60" title={pedido.id}>
                      {pedido.id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-clama-cream font-medium">{pedido.nome}</td>
                    <td className="px-4 py-3 text-sm text-clama-cream/70 hidden md:table-cell">{pedido.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block px-2 py-1 text-xs rounded",
                          STATUS_COLORS[pedido.status ?? ""] || "bg-gray-500/20 text-gray-400",
                        )}
                      >
                        {rotuloDoStatus(pedido.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-clama-cream/80">
                      {pedido.gratuito ? "Gratuito" : formatCurrency(pedido.valorCentavos ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-clama-cream/70 hidden lg:table-cell">{pedido.plano ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-clama-cream/80">{formatarData(pedido.criadoEm)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Ver pedido"
                        onClick={() => setSelectedPedidoId(pedido.id ?? null)}
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

      <PedidoDetailDrawer
        pedidoId={selectedPedidoId}
        onClose={() => {
          setSelectedPedidoId(null)
          // o ?id= do link do alerta sai da URL: recarregar não reabre o detalhe
          if (searchParams.has("id")) {
            const resto = new URLSearchParams(searchParams)
            resto.delete("id")
            setSearchParams(resto, { replace: true })
          }
        }}
        onChanged={() => setReloadToken((n) => n + 1)}
      />
    </div>
  )
}

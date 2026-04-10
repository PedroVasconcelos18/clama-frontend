import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { useAdminApi } from "@/hooks/useAdminApi"
import { PastoralApiError } from "@/lib/api"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PedidoDetailDrawer } from "@/components/admin/PedidoDetailDrawer"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, ArrowUpDown, Search, Eye } from "lucide-react"
import type { AdminPedidoListItem, PaginatedResponse } from "@/types/admin.types"

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "aguardando_pagamento", label: "Aguardando Pagamento" },
  { value: "pago", label: "Pago" },
  { value: "gerando_oracao", label: "Gerando" },
  { value: "oracao_enviada", label: "Enviada" },
  { value: "erro", label: "Erro" },
  { value: "aguardando_reenvio", label: "Aguardando Reenvio" },
]

const CANAL_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
]

const STATUS_COLORS: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-500/20 text-yellow-400",
  pago: "bg-green-500/20 text-green-400",
  gerando_oracao: "bg-blue-500/20 text-blue-400",
  oracao_enviada: "bg-green-500/20 text-green-400",
  erro: "bg-red-500/20 text-red-400",
  aguardando_reenvio: "bg-yellow-500/20 text-yellow-400",
}

export default function PedidosListPage() {
  const { adminFetch } = useAdminApi()
  const [searchParams, setSearchParams] = useSearchParams()

  const [pedidos, setPedidos] = useState<AdminPedidoListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drawer state
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null)

  // Filters from URL
  const page = parseInt(searchParams.get("page") || "1")
  const status = searchParams.get("status") || ""
  const canal = searchParams.get("canal") || ""
  const search = searchParams.get("search") || ""
  const ordering = searchParams.get("ordering") || "-created_at"

  const pageSize = 20
  const totalPages = Math.ceil(totalCount / pageSize)

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams)
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value)
        } else {
          newParams.delete(key)
        }
      })
      // Reset to page 1 when filters change
      if (!updates.page) {
        newParams.set("page", "1")
      }
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams]
  )

  useEffect(() => {
    async function loadPedidos() {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set("page", page.toString())
      params.set("ordering", ordering)
      if (status) params.set("status", status)
      if (canal) params.set("canal_entrega", canal)
      if (search) params.set("search", search)

      try {
        const data = await adminFetch<PaginatedResponse<AdminPedidoListItem>>(
          `/api/admin/pedidos/?${params.toString()}`
        )
        setPedidos(data.results)
        setTotalCount(data.count)
      } catch (err) {
        if (err instanceof PastoralApiError) {
          setError(err.pastoralMessage)
        } else {
          setError("Erro ao carregar pedidos.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPedidos()
  }, [adminFetch, page, status, canal, search, ordering])

  const toggleOrdering = () => {
    updateParams({ ordering: ordering === "-created_at" ? "created_at" : "-created_at" })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-serif text-clama-gold">Pedidos</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clama-cream/40" />
          <Input
            placeholder="Buscar nome ou e-mail..."
            value={search}
            onChange={(e) => updateParams({ search: e.target.value })}
            className="pl-9 bg-clama-night border-clama-gold/30 text-clama-cream placeholder:text-clama-cream/40"
          />
        </div>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="h-9 px-3 rounded-lg bg-clama-night border border-clama-gold/30 text-clama-cream text-sm focus:outline-none focus:border-clama-gold"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Canal Filter */}
        <select
          value={canal}
          onChange={(e) => updateParams({ canal: e.target.value })}
          className="h-9 px-3 rounded-lg bg-clama-night border border-clama-gold/30 text-clama-cream text-sm focus:outline-none focus:border-clama-gold"
        >
          {CANAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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
                    onClick={toggleOrdering}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-clama-gold/20">
            <p className="text-sm text-clama-cream/60">
              Página {page} de {totalPages} ({totalCount} pedidos)
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10 disabled:opacity-50"
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <PedidoDetailDrawer
        pedidoId={selectedPedidoId}
        onClose={() => setSelectedPedidoId(null)}
      />
    </div>
  )
}

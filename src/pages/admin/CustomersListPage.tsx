import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Info,
  Search,
  UserCheck,
  UserX,
} from "lucide-react"

import { useAdminApi } from "@/hooks/useAdminApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CustomerDetailDrawer } from "@/components/admin/CustomerDetailDrawer"
import { PedidoDetailDrawer } from "@/components/admin/PedidoDetailDrawer"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { cn } from "@/lib/utils"
import type {
  AdminCustomerListItem,
  AdminPedidoListItem,
  PaginatedResponse,
} from "@/types/admin.types"

const PAGE_SIZE = 20

type CustomersResponse = PaginatedResponse<AdminCustomerListItem>
type PedidosResponse = PaginatedResponse<AdminPedidoListItem>

function dateOnly(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR")
}

export default function CustomersListPage() {
  const { adminFetch } = useAdminApi()

  const [data, setData] = useState<CustomersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [q, setQ] = useState("")
  const [bannedFilter, setBannedFilter] = useState<"" | "true" | "false">("")
  const [freemiumFilter, setFreemiumFilter] = useState<"" | "true" | "false">("")
  const [offset, setOffset] = useState(0)

  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [banTarget, setBanTarget] = useState<AdminCustomerListItem | null>(null)
  const [unbanTarget, setUnbanTarget] = useState<AdminCustomerListItem | null>(
    null,
  )
  const [detailCustomerId, setDetailCustomerId] = useState<number | null>(null)
  const [detailPedidoId, setDetailPedidoId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    })
    if (q.trim()) params.set("q", q.trim())
    if (bannedFilter) params.set("banned", bannedFilter)
    if (freemiumFilter) params.set("freemium", freemiumFilter)

    adminFetch<CustomersResponse>(`/api/admin/customers/?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err: { pastoralMessage?: string }) => {
        if (!cancelled)
          setError(err?.pastoralMessage ?? "Não foi possível carregar customers.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adminFetch, q, bannedFilter, freemiumFilter, offset, reloadToken])

  // Reset offset quando filtros mudam
  const resetFilters = useCallback(
    (
      updater: () => void,
    ) => {
      updater()
      setOffset(0)
    },
    [],
  )

  const onBanConfirm = useCallback(
    async (motivo: string) => {
      if (!banTarget) return
      try {
        await adminFetch(`/api/blog/admin/banned-customers/`, {
          method: "POST",
          body: JSON.stringify({ customer_id: banTarget.id, motivo }),
        })
        toast.success(`${banTarget.email} banido do blog.`)
        setBanTarget(null)
        setReloadToken((n) => n + 1)
      } catch (err) {
        const e = err as { pastoralMessage?: string }
        toast.error(e?.pastoralMessage ?? "Falha ao banir.")
      }
    },
    [adminFetch, banTarget],
  )

  const onUnbanConfirm = useCallback(async () => {
    if (!unbanTarget) return
    try {
      await adminFetch(
        `/api/blog/admin/banned-customers/${unbanTarget.id}/`,
        { method: "DELETE" },
      )
      toast.success(`Banimento de ${unbanTarget.email} revogado.`)
      setUnbanTarget(null)
      setReloadToken((n) => n + 1)
    } catch (err) {
      const e = err as { pastoralMessage?: string }
      toast.error(e?.pastoralMessage ?? "Falha ao revogar banimento.")
    }
  }, [adminFetch, unbanTarget])

  const customers = data?.results ?? []
  const total = data?.count ?? 0
  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-clama-gold">Customers</h1>
          <p className="text-sm text-clama-cream/60">
            Lista de todos os usuários do Clama, com pedidos e moderação do blog.
          </p>
        </div>
        <span className="text-sm text-clama-cream/60">{total} no total</span>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3">
        <div className="flex-1 min-w-[220px]">
          <Label
            htmlFor="cust-q"
            className="text-xs uppercase tracking-wider text-clama-gold/80"
          >
            Buscar
          </Label>
          <div className="relative mt-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-clama-cream/40" />
            <Input
              id="cust-q"
              value={q}
              onChange={(e) => resetFilters(() => setQ(e.target.value))}
              placeholder="email ou nome"
              className="pl-8 bg-clama-night border-clama-gold/30 text-clama-cream"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-clama-gold/80">
            Banimento
          </Label>
          <select
            value={bannedFilter}
            onChange={(e) =>
              resetFilters(() =>
                setBannedFilter(e.target.value as typeof bannedFilter),
              )
            }
            className="mt-1 block bg-clama-night border border-clama-gold/30 text-clama-cream rounded-md h-9 px-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="true">Banidos</option>
            <option value="false">Não banidos</option>
          </select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-clama-gold/80">
            Freemium
          </Label>
          <select
            value={freemiumFilter}
            onChange={(e) =>
              resetFilters(() =>
                setFreemiumFilter(e.target.value as typeof freemiumFilter),
              )
            }
            className="mt-1 block bg-clama-night border border-clama-gold/30 text-clama-cream rounded-md h-9 px-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="true">Já usou</option>
            <option value="false">Ainda não</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-md border border-clama-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-clama-night-deep text-clama-cream/70">
            <tr>
              <th className="p-3 w-10"></th>
              <th className="p-3">Email</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Cadastro</th>
              <th className="p-3 text-center">Pedidos</th>
              <th className="p-3 text-center">Coment.</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-6 text-center">
                  <LoadingSpinner size={20} />
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-red-300">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && customers.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-clama-cream/60">
                  Nenhum customer encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              customers.map((c) => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  expanded={expandedId === c.id}
                  onToggle={() =>
                    setExpandedId((cur) => (cur === c.id ? null : c.id))
                  }
                  onBan={() => setBanTarget(c)}
                  onUnban={() => setUnbanTarget(c)}
                  onDetails={() => setDetailCustomerId(c.id)}
                  onViewPedido={(id) => setDetailPedidoId(id)}
                />
              ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-clama-cream/60">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              ← Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Próxima →
            </Button>
          </div>
        </div>
      )}

      {/* Modal Banir */}
      <BanDialog
        target={banTarget}
        onCancel={() => setBanTarget(null)}
        onConfirm={onBanConfirm}
      />

      {/* Modal Desbanir */}
      <Dialog
        open={!!unbanTarget}
        onOpenChange={(open) => !open && setUnbanTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar banimento?</DialogTitle>
            <DialogDescription>
              {unbanTarget?.email} poderá comentar no blog novamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnbanTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={onUnbanConfirm}>Revogar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerDetailDrawer
        customerId={detailCustomerId}
        onClose={() => setDetailCustomerId(null)}
      />

      <PedidoDetailDrawer
        pedidoId={detailPedidoId}
        onClose={() => setDetailPedidoId(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function CustomerRow({
  customer,
  expanded,
  onToggle,
  onBan,
  onUnban,
  onDetails,
  onViewPedido,
}: {
  customer: AdminCustomerListItem
  expanded: boolean
  onToggle: () => void
  onBan: () => void
  onUnban: () => void
  onDetails: () => void
  onViewPedido: (id: string) => void
}) {
  return (
    <>
      <tr className="border-t border-clama-gold/10 hover:bg-clama-night-soft/40">
        <td className="p-3 align-middle">
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? "Recolher pedidos" : "Expandir pedidos"}
            className="text-clama-cream/60 hover:text-clama-gold"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="p-3 align-middle">
          <span className="text-clama-cream">{customer.email}</span>
          {customer.is_clama_admin && (
            <span className="ml-2 rounded-full bg-clama-gold/15 px-2 py-0.5 text-xs text-clama-gold">
              Admin
            </span>
          )}
        </td>
        <td className="p-3 align-middle text-clama-cream/80">
          {customer.nome_completo || "—"}
        </td>
        <td className="p-3 align-middle text-clama-cream/60">
          {new Date(customer.date_joined).toLocaleDateString("pt-BR")}
        </td>
        <td className="p-3 align-middle text-center">
          <span className="text-clama-cream">{customer.total_pedidos}</span>
          <span className="text-clama-cream/40">
            {" "}
            ({customer.pedidos_pagos}p / {customer.pedidos_gratuitos}g)
          </span>
        </td>
        <td className="p-3 align-middle text-center text-clama-cream">
          {customer.total_comentarios}
        </td>
        <td className="p-3 align-middle">
          {customer.is_banned ? (
            <span
              className="rounded-full border border-red-400/40 px-2 py-0.5 text-xs text-red-300"
              title={customer.motivo_ban ?? undefined}
            >
              Banido
            </span>
          ) : customer.freemium_used_at ? (
            <span className="rounded-full border border-emerald-400/40 px-2 py-0.5 text-xs text-emerald-300">
              Ativo
            </span>
          ) : (
            <span className="rounded-full border border-clama-cream/20 px-2 py-0.5 text-xs text-clama-cream/60">
              Novo
            </span>
          )}
        </td>
        <td className="p-3 align-middle text-right">
          <div className="inline-flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDetails}
              className="border-clama-gold/40 text-clama-gold hover:bg-clama-gold/10"
            >
              <Info className="h-3.5 w-3.5 mr-1" />
              Detalhes
            </Button>
            {customer.is_banned ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnban}
                className="border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                Desbanir
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onBan}
                disabled={customer.is_clama_admin}
                className="border-red-400/40 text-red-300 hover:bg-red-400/10"
                title={
                  customer.is_clama_admin
                    ? "Admins não podem ser banidos"
                    : undefined
                }
              >
                <UserX className="h-3.5 w-3.5 mr-1" />
                Banir
              </Button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-clama-night/40 border-t border-clama-gold/10">
          <td colSpan={8} className="p-4">
            <PedidosOfCustomer
              customerId={customer.id}
              onViewPedido={onViewPedido}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Pedidos expand
// ---------------------------------------------------------------------------

function PedidosOfCustomer({
  customerId,
  onViewPedido,
}: {
  customerId: number
  onViewPedido: (id: string) => void
}) {
  const { adminFetch } = useAdminApi()
  const [pedidos, setPedidos] = useState<AdminPedidoListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPedidos(null)
    setError(null)
    adminFetch<PedidosResponse>(
      `/api/admin/pedidos/?user_id=${customerId}&limit=50&ordering=-created_at`,
    )
      .then((res) => {
        if (!cancelled) setPedidos(res.results)
      })
      .catch((err: { pastoralMessage?: string }) => {
        if (!cancelled)
          setError(err?.pastoralMessage ?? "Falha ao carregar pedidos.")
      })
    return () => {
      cancelled = true
    }
  }, [adminFetch, customerId])

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>
  }
  if (pedidos === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-clama-cream/60">
        <LoadingSpinner size={14} /> Carregando pedidos…
      </div>
    )
  }
  if (pedidos.length === 0) {
    return (
      <p className="text-sm text-clama-cream/60">Este customer não tem pedidos.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-clama-cream/50">
          <tr>
            <th className="p-2">Data</th>
            <th className="p-2">Plano</th>
            <th className="p-2">Valor</th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Canal</th>
            <th className="p-2">Status</th>
            <th className="p-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => (
            <tr key={p.id} className="border-t border-clama-gold/5">
              <td className="p-2 text-clama-cream/70">{dateOnly(p.created_at)}</td>
              <td className="p-2 text-clama-cream">
                {p.eh_gratuito ? "Oração gratuita" : p.plano_nome}
              </td>
              <td className="p-2 text-clama-cream/70">
                {p.eh_gratuito ? "—" : p.valor_reais_str}
              </td>
              <td className="p-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                    p.eh_gratuito
                      ? "border-clama-gold/40 text-clama-gold"
                      : "border-emerald-400/40 text-emerald-300",
                  )}
                >
                  {p.eh_gratuito ? "Gratuito" : "Pago"}
                </span>
              </td>
              <td className="p-2 text-clama-cream/70">
                {p.canal_entrega === "whatsapp" ? "WhatsApp" : "E-mail"}
              </td>
              <td className="p-2 text-clama-cream/70">{p.status}</td>
              <td className="p-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewPedido(p.id)}
                  className="text-clama-gold hover:bg-clama-gold/10"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Ver
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ban dialog
// ---------------------------------------------------------------------------

function BanDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: AdminCustomerListItem | null
  onCancel: () => void
  onConfirm: (motivo: string) => Promise<void>
}) {
  const [motivo, setMotivo] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Reset ao abrir
  useEffect(() => {
    if (target) {
      setMotivo("")
      setSubmitting(false)
    }
  }, [target])

  async function handleSubmit() {
    if (motivo.trim().length < 3) {
      toast.error("Informe um motivo (≥3 caracteres).")
      return
    }
    setSubmitting(true)
    try {
      await onConfirm(motivo.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Banir do blog</DialogTitle>
          <DialogDescription>
            {target?.email} não poderá mais comentar ou curtir no blog. O motivo
            é interno (não é mostrado ao usuário).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="ban-motivo">Motivo</Label>
          <Textarea
            id="ban-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: linguagem ofensiva em múltiplos comentários."
            rows={3}
            disabled={submitting}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Banindo…" : "Banir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

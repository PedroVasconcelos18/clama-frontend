import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAdminApi } from "@/hooks/useAdminApi"
import { tempoRelativo } from "@/lib/datetime"
import type {
  AdminCustomerBanido,
  PaginatedAdminBanidos,
} from "@/types/blog.types"

const PAGE_SIZE = 20

export default function BlogBannedPage() {
  const { adminFetch } = useAdminApi()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaginatedAdminBanidos | null>(null)
  const [loading, setLoading] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [unbanTarget, setUnbanTarget] =
    useState<AdminCustomerBanido | null>(null)
  const [actionInFlight, setActionInFlight] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminFetch<PaginatedAdminBanidos>(
      `/api/blog/admin/banned-customers/?page=${page}&page_size=${PAGE_SIZE}`,
    )
      .then((response) => {
        if (!cancelled) setData(response)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adminFetch, page, reloadToken])

  async function handleConfirmUnban() {
    if (!unbanTarget) return
    setActionInFlight(true)
    try {
      await adminFetch(
        `/api/blog/admin/banned-customers/${unbanTarget.customer_id}/`,
        { method: "DELETE" },
      )
      toast.success("Banimento revogado.")
      setUnbanTarget(null)
      setReloadToken((n) => n + 1)
    } finally {
      setActionInFlight(false)
    }
  }

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0
  const banidos = data?.results ?? []

  return (
    <div className="space-y-4 bg-clama-night-deep p-6 text-clama-cream">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl text-clama-gold">
          Customers banidos
        </h1>
        <span className="text-sm text-clama-cream/60">
          {data?.count ?? 0} ativos
        </span>
      </header>

      <div className="overflow-x-auto rounded-md border border-clama-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-clama-night text-clama-cream/70">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Banido por</th>
              <th className="p-3">Quando</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-3 text-clama-cream/60" colSpan={5}>
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && banidos.length === 0 && (
              <tr>
                <td className="p-6 text-center text-clama-cream/60" colSpan={5}>
                  Nenhum customer banido no momento.
                </td>
              </tr>
            )}
            {banidos.map((b) => (
              <tr key={b.id} className="border-t border-clama-gold/10">
                <td className="p-3">
                  <div>{b.customer_nome}</div>
                  <div className="text-xs text-clama-cream/50">
                    {b.customer_email}
                  </div>
                </td>
                <td className="max-w-[40ch] p-3 text-clama-cream/70">
                  <div className="line-clamp-3">{b.motivo}</div>
                </td>
                <td className="p-3 text-clama-cream/70">
                  {b.banido_por_email}
                </td>
                <td className="p-3 text-clama-cream/70">
                  {tempoRelativo(b.banido_em)}
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnbanTarget(b)}
                  >
                    Revogar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-clama-cream/60">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={unbanTarget !== null}
        onOpenChange={(o) => !o && setUnbanTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar banimento</DialogTitle>
            <DialogDescription>
              {unbanTarget?.customer_nome} vai voltar a poder comentar e curtir
              posts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnbanTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              disabled={actionInFlight}
              onClick={handleConfirmUnban}
            >
              Revogar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { RotateCw, X } from "lucide-react"

import { useApi } from "@/hooks/useApi"
import { usePaginaAdmin } from "@/hooks/useAdminList"
import { AdminPager } from "@/components/admin/AdminPager"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PedidoDetailDrawer } from "@/components/admin/PedidoDetailDrawer"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { formatarDataHora as fmt } from "@/lib/datetime"
import type { AdminEventoMp } from "@/types/admin.types"

const selectCls =
  "mt-1 block bg-clama-night border border-clama-gold/30 text-clama-cream rounded-md h-9 px-2 text-sm"

/** Só RECEBIDO e ERRO reprocessam; os demais são finais (409 evento_encerrado). */
const podeReprocessar = (e: AdminEventoMp) => e.status === "RECEBIDO" || e.status === "ERRO"

/** `resultado` do reprocessamento = o `status` que o webhook responderia. */
const RESULTADO: Record<string, string> = {
  ok: "Pagamento confirmado: pedido pago e oração na fila.",
  already_paid: "Esse pedido já estava pago; o evento foi marcado como ignorado.",
  already_processed: "Esse evento já tinha sido processado por outra chamada.",
  ignored: "Evento ignorado: não havia pagamento aprovado para processar.",
  error: "O reprocesso falhou de novo; o evento continua em erro.",
}

/** Eventos do Mercado Pago (`/api/admin/eventos-mp`, D21). O payload só aparece nos detalhes. */
export default function WebhooksPage() {
  const { fetchApi } = useApi()
  const [status, setStatus] = useState("")
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [target, setTarget] = useState<AdminEventoMp | null>(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = usePaginaAdmin<AdminEventoMp>("/api/admin/eventos-mp", { status }, offset, reloadToken)
  const rows = data?.content ?? []
  const total = data?.page.totalElements ?? 0

  async function reprocessar() {
    if (!target) return
    setBusy(true)
    try {
      const res = await fetchApi<{ resultado?: string }>(`/api/admin/eventos-mp/${target.id}/reprocessamento`, {
        method: "POST",
        showToast: false,
      })
      toast.success(RESULTADO[res.resultado ?? ""] ?? "Reprocessado.")
      setTarget(null)
      setReloadToken((n) => n + 1)
    } catch (err) {
      toast.error((err as { pastoralMessage?: string })?.pastoralMessage ?? "Falha ao reprocessar.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-clama-gold">Eventos do Mercado Pago</h1>
          <p className="text-sm text-clama-cream/60">
            Notificações de pagamento recebidas. O payload só aparece nos detalhes.
          </p>
        </div>
        <span className="text-sm text-clama-cream/60">{total} no total</span>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3">
        <div>
          <Label htmlFor="ev-status" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Status
          </Label>
          <select
            id="ev-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setOffset(0)
            }}
            className={selectCls}
          >
            <option value="">Todos</option>
            <option value="RECEBIDO">Recebido</option>
            <option value="PROCESSADO">Processado</option>
            <option value="IGNORADO">Ignorado</option>
            <option value="ERRO">Erro</option>
          </select>
        </div>
      </div>

      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}

      <div className="overflow-x-auto rounded-md border border-clama-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-clama-night-deep text-clama-cream/70">
            <tr>
              <th className="p-3">Recebido em</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Evento</th>
              <th className="p-3">Pagamento MP</th>
              <th className="p-3">Status</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Pedido</th>
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
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-clama-cream/60">
                  Nenhum evento encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((ev) => (
                <tr key={ev.id} className="border-t border-clama-gold/10">
                  <td className="p-3 text-clama-cream/60">{fmt(ev.recebidoEm)}</td>
                  <td className="p-3 text-clama-cream/80">{ev.tipo ?? "—"}</td>
                  <td className="p-3 font-mono text-xs text-clama-cream/60">{ev.idExterno}</td>
                  <td className="p-3 font-mono text-xs text-clama-cream/60">{ev.mpPagamentoId ?? "—"}</td>
                  <td className="p-3 text-clama-cream/80">{ev.status}</td>
                  <td className="p-3 text-xs text-clama-cream/70">{ev.motivo ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">
                    {ev.pedidoId ? (
                      <button type="button" onClick={() => setPedidoId(ev.pedidoId!)}
                        className="text-clama-gold hover:underline">
                        {ev.pedidoId.slice(0, 8)}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setDetailId(ev.id ?? null)}
                      className="border-clama-gold/40 text-clama-gold hover:bg-clama-gold/10">
                      Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <AdminPager offset={offset} total={total} onChange={setOffset} />

      <Dialog open={!!target} onOpenChange={(open) => !open && !busy && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprocessar evento?</DialogTitle>
            <DialogDescription>
              O evento {target?.idExterno} será processado de novo, com o status atual do pagamento no Mercado Pago.
              Se o pagamento estiver aprovado, o pedido pode ser marcado como pago e a oração entra na fila.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={reprocessar} disabled={busy}>
              {busy ? "Reprocessando…" : "Confirmar reprocesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventoDrawer
        id={detailId}
        onClose={() => setDetailId(null)}
        onReprocessar={setTarget}
        confirmando={!!target}
        reloadToken={reloadToken}
      />
      <PedidoDetailDrawer pedidoId={pedidoId} onClose={() => setPedidoId(null)} />
    </div>
  )
}

function EventoDrawer({
  id,
  onClose,
  onReprocessar,
  confirmando,
  reloadToken,
}: {
  id: number | null
  onClose: () => void
  onReprocessar: (e: AdminEventoMp) => void
  /** Dialog de confirmação aberto: Escape é dele, não do drawer. */
  confirmando: boolean
  reloadToken: number
}) {
  const { fetchApi } = useApi()
  const [res, setRes] = useState<{ id: number; data?: AdminEventoMp; error?: string } | null>(null)

  useEffect(() => {
    if (id == null) return
    let cancelled = false
    fetchApi<AdminEventoMp>(`/api/admin/eventos-mp/${id}`)
      .then((data) => !cancelled && setRes({ id, data }))
      .catch((err: { pastoralMessage?: string }) => {
        if (!cancelled) setRes({ id, error: err?.pastoralMessage ?? "Erro ao carregar o evento." })
      })
    return () => {
      cancelled = true
    }
  }, [fetchApi, id, reloadToken])

  useEffect(() => {
    if (id == null || confirmando) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [id, onClose, confirmando])

  const atual = res?.id === id ? res : null
  const data = atual?.data
  const error = atual?.error

  if (id == null) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[560px] overflow-y-auto bg-clama-night-deep border-l border-clama-gold/20 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do evento"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-clama-gold/20 bg-clama-night-deep px-5 py-4">
          <h2 className="font-serif text-lg text-clama-gold">Detalhes do evento</h2>
          <Button autoFocus variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar"
            className="text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="p-5 space-y-3 text-sm text-clama-cream">
          {!data && !error && (
            <div className="flex justify-center py-10">
              <LoadingSpinner size={24} />
            </div>
          )}
          {error && <PastoralAlert variant="error">{error}</PastoralAlert>}
          {data && (
            <>
              <p>{data.tipo ?? "—"} · {data.status}{data.motivo ? ` · ${data.motivo}` : ""}</p>
              <p className="font-mono text-xs text-clama-cream/60">{data.idExterno}</p>
              {data.mpPagamentoId && <p className="text-xs">Pagamento MP: {data.mpPagamentoId}</p>}
              {data.pedidoId && <p className="text-xs">Pedido: {data.pedidoId}</p>}
              <p className="text-xs text-clama-cream/60">
                Recebido em {fmt(data.recebidoEm)}; atualizado em {fmt(data.atualizadoEm)}
              </p>
              {podeReprocessar(data) && (
                <Button variant="outline" size="sm" onClick={() => onReprocessar(data)}
                  className="border-clama-gold/40 text-clama-gold hover:bg-clama-gold/10">
                  <RotateCw className="h-3.5 w-3.5 mr-1" />
                  Reprocessar
                </Button>
              )}
              <h3 className="text-xs font-bold uppercase tracking-[2px] text-clama-gold">Payload</h3>
              <pre className="overflow-x-auto rounded-md bg-clama-night p-3 text-xs">
                {JSON.stringify(data.payload, null, 2)}
              </pre>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

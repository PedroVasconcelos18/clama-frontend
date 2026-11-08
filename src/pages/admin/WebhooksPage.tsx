import { useEffect, useState } from "react"
import { toast } from "sonner"
import { RotateCw, X } from "lucide-react"

import { useApi } from "@/hooks/useApi"
import { useAdminList } from "@/hooks/useAdminList"
import { AdminPager } from "@/components/admin/AdminPager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import type { AdminWebhook } from "@/types/admin.types"

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR")
const selectCls =
  "mt-1 block bg-clama-night border border-clama-gold/30 text-clama-cream rounded-md h-9 px-2 text-sm"

/** Só RECEBIDO/ERRO de MERCADO_PAGO ou WORDPRESS reprocessam (D9). */
const podeReprocessar = (w: AdminWebhook) =>
  (w.status === "RECEBIDO" || w.status === "ERRO") &&
  (w.provider === "MERCADO_PAGO" || w.provider === "WORDPRESS")

const EVENT_TYPES = ["payment", "post_publicado", "post_atualizado", "post_removido"]
const curto = (t: string, n: number) => (t.length > n ? `${t.slice(0, n)}…` : t)

const RESULTADO: Record<string, string> = {
  enfileirado: "Reprocesso enfileirado.",
  ja_na_fila: "Esse evento já estava na fila.",
  ok: "Pagamento confirmado: pedido pago e oração na fila.",
  already_paid: "Esse pedido já estava pago; o evento foi marcado como ignorado.",
  already_processed: "Esse evento já tinha sido processado por outra chamada.",
  ignored: "Evento ignorado: não havia pagamento aprovado para processar.",
}

export default function WebhooksPage() {
  const { fetchApi } = useApi()
  const [provider, setProvider] = useState("")
  const [status, setStatus] = useState("")
  const [eventType, setEventType] = useState("")
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [offset, setOffset] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [target, setTarget] = useState<AdminWebhook | null>(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = useAdminList<AdminWebhook>(
    "/api/admin/webhooks/",
    { provider, status, event_type: eventType, q },
    offset,
    reloadToken,
  )
  const rows = data?.results ?? []
  const total = data?.count ?? 0

  function filtro(set: (v: string) => void) {
    return (v: string) => {
      set(v)
      setOffset(0)
    }
  }

  async function reprocessar() {
    if (!target) return
    setBusy(true)
    try {
      const res = await fetchApi<{ status: string }>(
        `/api/admin/webhooks/${target.id}/reprocessar/`,
        { method: "POST", showToast: false },
      )
      toast.success(RESULTADO[res.status] ?? "Reprocessado.")
      setTarget(null)
      setDetailId(null)
      setReloadToken((n) => n + 1)
    } catch (err) {
      toast.error(
        (err as { pastoralMessage?: string })?.pastoralMessage ??
          "Falha ao reprocessar.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-clama-gold">Webhooks recebidos</h1>
          <p className="text-sm text-clama-cream/60">
            Eventos dos provedores de pagamento e do blog. O payload só aparece nos detalhes.
          </p>
        </div>
        <span className="text-sm text-clama-cream/60">{total} no total</span>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3">
        <div className="flex-1 min-w-[220px]">
          <Label htmlFor="wh-q" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Buscar
          </Label>
          <Input
            id="wh-q"
            value={q}
            onChange={(e) => filtro(setQ)(e.target.value)}
            placeholder="id do evento ou do pedido"
            className="mt-1 bg-clama-night border-clama-gold/30 text-clama-cream"
          />
        </div>
        <div>
          <Label htmlFor="wh-provider" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Provedor
          </Label>
          <select id="wh-provider" value={provider} onChange={(e) => filtro(setProvider)(e.target.value)} className={selectCls}>
            <option value="">Todos</option>
            <option value="MERCADO_PAGO">Mercado Pago</option>
            <option value="WORDPRESS">WordPress</option>
            <option value="ASAAS">Asaas</option>
            <option value="ZAPI">Z-API</option>
          </select>
        </div>
        <div>
          <Label htmlFor="wh-event" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Tipo
          </Label>
          <select id="wh-event" value={eventType} onChange={(e) => filtro(setEventType)(e.target.value)} className={selectCls}>
            <option value="">Todos</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="wh-status" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Status
          </Label>
          <select id="wh-status" value={status} onChange={(e) => filtro(setStatus)(e.target.value)} className={selectCls}>
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
              <th className="p-3">Provedor</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Evento</th>
              <th className="p-3">Status</th>
              <th className="p-3">Pedido</th>
              <th className="p-3">Erro</th>
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
                  Nenhum webhook encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((w) => (
                <tr key={w.id} className="border-t border-clama-gold/10">
                  <td className="p-3 text-clama-cream/60">{fmt(w.created_at)}</td>
                  <td className="p-3 text-clama-cream">{w.provider}</td>
                  <td className="p-3 text-clama-cream/80">{w.event_type}</td>
                  <td className="p-3 font-mono text-xs text-clama-cream/60">{w.external_event_id}</td>
                  <td className="p-3 text-clama-cream/80">{w.status}</td>
                  <td className="p-3 font-mono text-xs">
                    {w.pedido_id ? (
                      <button type="button" onClick={() => setPedidoId(w.pedido_id)}
                        className="text-clama-gold hover:underline">
                        {w.pedido_id.slice(0, 8)}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-xs text-red-300" title={w.error_message || undefined}>
                    {w.error_message ? curto(w.error_message, 60) : "—"}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDetailId(w.id)}
                        className="border-clama-gold/40 text-clama-gold hover:bg-clama-gold/10">
                        Detalhes
                      </Button>
                    </div>
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
            <DialogTitle>Reprocessar webhook?</DialogTitle>
            <DialogDescription>
              O evento {target?.external_event_id} será processado de novo. Se for um pagamento
              aprovado, o pedido pode ser marcado como pago e a oração será disparada.
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

      <WebhookDrawer
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

function WebhookDrawer({
  id,
  onClose,
  onReprocessar,
  confirmando,
  reloadToken,
}: {
  id: string | null
  onClose: () => void
  onReprocessar: (w: AdminWebhook) => void
  /** Dialog de confirmação aberto: Escape é dele, não do drawer. */
  confirmando: boolean
  reloadToken: number
}) {
  const { fetchApi } = useApi()
  const [res, setRes] = useState<{ id: string; data?: AdminWebhook; error?: string } | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchApi<AdminWebhook>(`/api/admin/webhooks/${id}/`)
      .then((data) => !cancelled && setRes({ id, data }))
      .catch((err: { pastoralMessage?: string }) => {
        if (!cancelled)
          setRes({ id, error: err?.pastoralMessage ?? "Erro ao carregar o webhook." })
      })
    return () => {
      cancelled = true
    }
  }, [fetchApi, id, reloadToken])

  useEffect(() => {
    if (!id || confirmando) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [id, onClose, confirmando])

  const atual = res?.id === id ? res : null
  const data = atual?.data
  const error = atual?.error

  if (!id) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[560px] overflow-y-auto bg-clama-night-deep border-l border-clama-gold/20 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do webhook"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-clama-gold/20 bg-clama-night-deep px-5 py-4">
          <h2 className="font-serif text-lg text-clama-gold">Detalhes do webhook</h2>
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
              <p>{data.provider} · {data.event_type} · {data.status}</p>
              <p className="font-mono text-xs text-clama-cream/60">{data.external_event_id}</p>
              {data.pedido_id && <p className="text-xs">Pedido: {data.pedido_id}</p>}
              <p className="text-xs text-clama-cream/60">
                Recebido em {fmt(data.created_at)}; atualizado em {fmt(data.updated_at)}
              </p>
              {data.error_message && (
                <PastoralAlert variant="error">{data.error_message}</PastoralAlert>
              )}
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

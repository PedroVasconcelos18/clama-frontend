import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Link } from "react-router-dom"

import { useApi } from "@/hooks/useApi"
import { usePaginaAdmin } from "@/hooks/useAdminList"
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
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { formatarData } from "@/lib/datetime"
import { formatCurrency } from "@/lib/formatters"
import type { AdminInstituicao, AdminRepasse } from "@/types/admin.types"

const SELECT = "mt-1 block bg-clama-night border border-clama-gold/30 text-clama-cream rounded-md h-9 px-2 text-sm"
const ROTULO = "text-xs uppercase tracking-wider text-clama-gold/80"
const STATUS: Record<string, string> = { REGISTRADO: "Registrado", TRANSFERIDO: "Transferido", CANCELADO: "Cancelado" }

/** Repasses às instituições (sem PII). Só REGISTRADO pode ser marcado como transferido. */
export default function RepassesPage() {
  const { fetchApi } = useApi()
  const [instituicaoId, setInstituicaoId] = useState("")
  const [status, setStatus] = useState("")
  const [de, setDe] = useState("")
  const [ate, setAte] = useState("")
  const [offset, setOffset] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [instituicoes, setInstituicoes] = useState<AdminInstituicao[]>([])
  const [alvo, setAlvo] = useState<AdminRepasse | null>(null)
  const [busy, setBusy] = useState(false)
  const [comprovante, setComprovante] = useState("")

  const { data: page, loading, error } = usePaginaAdmin<AdminRepasse>(
    "/api/admin/repasses",
    { instituicaoId, status, de, ate },
    offset,
    reloadToken,
  )
  const rows = page?.content ?? []
  const total = page?.page.totalElements ?? 0

  useEffect(() => {
    fetchApi<AdminInstituicao[]>("/api/admin/instituicoes", { showToast: false })
      .then(setInstituicoes)
      .catch(() => setInstituicoes([])) // o filtro é opcional
  }, [fetchApi])

  const filtro = (set: (v: string) => void) => (v: string) => {
    set(v)
    setOffset(0)
  }

  function fechar() {
    setAlvo(null)
    setComprovante("")
  }

  async function transferir() {
    if (!alvo || !comprovante.trim()) return
    setBusy(true)
    try {
      await fetchApi(`/api/admin/repasses/${alvo.id}/transferencia`, {
        method: "POST",
        body: JSON.stringify({ comprovante: comprovante.trim() }),
        showToast: false,
      })
      toast.success("Repasse marcado como transferido.")
      fechar()
      setReloadToken((n) => n + 1)
    } catch (err) {
      toast.error((err as { pastoralMessage?: string })?.pastoralMessage ?? "Não foi possível marcar o repasse.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-clama-gold">Repasses</h1>
          <p className="text-sm text-clama-cream/60">Parte de cada pedido pago destinada às instituições.</p>
        </div>
        <div className="text-right text-sm text-clama-cream/60">
          <span>{total} no total</span>
          <Link to="/admin/relatorios" className="block text-clama-gold underline">Relatórios e quitação do ciclo</Link>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3">
        <div>
          <Label htmlFor="rep-inst" className={ROTULO}>Instituição</Label>
          <select id="rep-inst" value={instituicaoId} onChange={(e) => filtro(setInstituicaoId)(e.target.value)} className={SELECT}>
            <option value="">Todas</option>
            {instituicoes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="rep-status" className={ROTULO}>Status</Label>
          <select id="rep-status" value={status} onChange={(e) => filtro(setStatus)(e.target.value)} className={SELECT}>
            <option value="">Todos</option>
            {Object.entries(STATUS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="rep-de" className={ROTULO}>De</Label>
          <input id="rep-de" type="date" value={de} max={ate || undefined}
            onChange={(e) => filtro(setDe)(e.target.value)} className={`${SELECT} [color-scheme:dark]`} />
        </div>
        <div>
          <Label htmlFor="rep-ate" className={ROTULO}>Até</Label>
          <input id="rep-ate" type="date" value={ate} min={de || undefined}
            onChange={(e) => filtro(setAte)(e.target.value)} className={`${SELECT} [color-scheme:dark]`} />
        </div>
      </div>

      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}

      <div className="overflow-x-auto rounded-md border border-clama-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-clama-night-deep text-clama-cream/70">
            <tr>
              <th className="p-3">Criado em</th>
              <th className="p-3">Instituição</th>
              <th className="p-3">Pedido</th>
              <th className="p-3 text-right">Base</th>
              <th className="p-3 text-right">%</th>
              <th className="p-3 text-right">Repasse</th>
              <th className="p-3">Status</th>
              <th className="p-3">Desfecho</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="p-6 text-center">
                  <LoadingSpinner size={20} />
                </td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-clama-cream/60">
                  Nenhum repasse encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-t border-clama-gold/10">
                  <td className="p-3 text-clama-cream/60">{formatarData(r.criadoEm)}</td>
                  <td className="p-3 text-clama-cream">{r.instituicao ?? `#${r.instituicaoId}`}</td>
                  <td className="p-3 font-mono text-xs text-clama-cream/60" title={r.pedidoId}>
                    {r.pedidoId?.slice(0, 8)}
                  </td>
                  <td className="p-3 text-right text-clama-cream/80">{formatCurrency(r.valorBaseCentavos ?? 0)}</td>
                  <td className="p-3 text-right text-clama-cream/80">{r.percentual}%</td>
                  <td className="p-3 text-right text-clama-cream">{formatCurrency(r.valorCentavos ?? 0)}</td>
                  <td className="p-3 text-clama-cream/80">{STATUS[r.status ?? ""] ?? r.status}</td>
                  <td className="p-3 text-xs text-clama-cream/60">
                    {r.transferidoEm && formatarData(r.transferidoEm)}
                    {r.canceladoEm && formatarData(r.canceladoEm)}
                    {r.motivo && <span className="block">{r.motivo}</span>}
                    {r.comprovante && <span className="block">Comprovante: {r.comprovante}</span>}
                  </td>
                  <td className="p-3 text-right">
                    {r.status === "REGISTRADO" && (
                      <Button variant="outline" size="sm" onClick={() => setAlvo(r)}
                        className="border-clama-gold/40 text-clama-gold hover:bg-clama-gold/10">
                        Marcar transferido
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <AdminPager offset={offset} total={total} onChange={setOffset} />

      <Dialog open={!!alvo} onOpenChange={(open) => !open && !busy && fechar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como transferido?</DialogTitle>
            <DialogDescription>
              Confirme que {formatCurrency(alvo?.valorCentavos ?? 0)} já foram transferidos para{" "}
              {alvo?.instituicao ?? "a instituição"}. Depois disso, um estorno do pedido não cancela mais o repasse:
              vira acerto no próximo ciclo.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="rep-comprovante" className={ROTULO}>Comprovante</Label>
            <Input id="rep-comprovante" value={comprovante} maxLength={120} required
              placeholder="Identificador do Pix ou número do recibo" onChange={(e) => setComprovante(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fechar} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={transferir} disabled={busy || !comprovante.trim()}>
              {busy ? "Marcando…" : "Confirmar transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

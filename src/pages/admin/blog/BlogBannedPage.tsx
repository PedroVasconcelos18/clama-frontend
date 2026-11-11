import { useState } from "react"
import { toast } from "sonner"
import { AdminPager } from "@/components/admin/AdminPager"
import { Button } from "@/components/ui/button"
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
import { useApi } from "@/hooks/useApi"
import { usePaginaAdmin } from "@/hooks/useAdminList"
import { tempoRelativo } from "@/lib/datetime"
import type { components } from "@/types/api-schema"

type Banimento = components["schemas"]["Item"]

/** Banimentos ativos do blog (`/api/admin/blog/banimentos`); revogar é por `usuarioId`. */
export default function BlogBannedPage() {
  const { fetchApi } = useApi()
  const [offset, setOffset] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [alvo, setAlvo] = useState<Banimento | null>(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = usePaginaAdmin<Banimento>("/api/admin/blog/banimentos", {}, offset, reloadToken)
  const total = data?.page.totalElements ?? 0
  const banidos = data?.content ?? []

  async function revogar() {
    if (!alvo) return
    setBusy(true)
    try {
      await fetchApi(`/api/admin/blog/banimentos/${alvo.usuarioId}`, { method: "DELETE" })
      toast.success("Banimento revogado.")
      setAlvo(null)
      setReloadToken((n) => n + 1)
    } catch {
      /* fetchApi já avisou com o toast */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 bg-clama-night-deep p-6 text-clama-cream">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl text-clama-gold">Usuários banidos</h1>
        <span className="text-sm text-clama-cream/60">{total} ativos</span>
      </header>

      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}

      <div className="overflow-x-auto rounded-md border border-clama-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-clama-night text-clama-cream/70">
            <tr>
              <th className="p-3">Usuário</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Banido por</th>
              <th className="p-3">Quando</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-3" colSpan={5}>
                  <LoadingSpinner size={20} />
                </td>
              </tr>
            )}
            {!loading && banidos.length === 0 && (
              <tr>
                <td className="p-6 text-center text-clama-cream/60" colSpan={5}>
                  Nenhum usuário banido no momento.
                </td>
              </tr>
            )}
            {banidos.map((b) => (
              <tr key={b.usuarioId} className="border-t border-clama-gold/10">
                <td className="p-3">
                  <div>{b.usuarioNome}</div>
                  <div className="text-xs text-clama-cream/50">{b.usuarioEmail}</div>
                </td>
                <td className="max-w-[40ch] p-3 text-clama-cream/70">
                  <div className="line-clamp-3">{b.motivo}</div>
                </td>
                <td className="p-3 text-clama-cream/70">{b.banidoPorEmail ?? "—"}</td>
                <td className="p-3 text-clama-cream/70">{b.banidoEm ? tempoRelativo(b.banidoEm) : "—"}</td>
                <td className="p-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => setAlvo(b)}>
                    Revogar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPager offset={offset} total={total} onChange={setOffset} />

      <Dialog open={alvo !== null} onOpenChange={(o) => !o && !busy && setAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar banimento</DialogTitle>
            <DialogDescription>{alvo?.usuarioNome} vai voltar a poder comentar e curtir posts.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvo(null)}>
              Cancelar
            </Button>
            <Button variant="default" disabled={busy} onClick={revogar}>
              Revogar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

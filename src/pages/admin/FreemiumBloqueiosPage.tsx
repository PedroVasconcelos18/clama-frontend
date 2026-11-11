import { useState } from "react"
import { toast } from "sonner"
import { LockOpen, Search } from "lucide-react"

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
import { formatarDataHora as fmt } from "@/lib/datetime"
import type { components } from "@/types/api-schema"

type Bloqueio = components["schemas"]["BloqueioAdmin"]

/** Bloqueio do freemium (`/api/admin/freemium/bloqueios`): quem já usou a oração gratuita. Só hashes truncados. */
export default function FreemiumBloqueiosPage() {
  const { fetchApi } = useApi()
  const [offset, setOffset] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [busca, setBusca] = useState({ email: "", cpfCnpj: "" })
  const [achados, setAchados] = useState<Bloqueio[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [target, setTarget] = useState<Bloqueio | null>(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = usePaginaAdmin<Bloqueio>("/api/admin/freemium/bloqueios", {}, offset, reloadToken)
  const total = data?.page.totalElements ?? 0

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    // os valores em claro só vão no corpo do POST, nunca na URL nem em log
    const corpo = Object.fromEntries(
      Object.entries(busca)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v),
    )
    if (Object.keys(corpo).length === 0) {
      toast.error("Informe o e-mail ou o CPF/CNPJ.")
      return
    }
    setBuscando(true)
    try {
      setAchados(
        await fetchApi<Bloqueio[]>("/api/admin/freemium/bloqueios/busca", {
          method: "POST",
          body: JSON.stringify(corpo),
        }),
      )
    } catch {
      setAchados(null) // fetchApi já avisou com o toast
    } finally {
      setBuscando(false)
    }
  }

  async function desbloquear() {
    if (!target) return
    setBusy(true)
    try {
      await fetchApi(`/api/admin/freemium/bloqueios/${target.id}`, { method: "DELETE", showToast: false })
      toast.success("Bloqueio removido.")
      setAchados((a) => a && a.filter((x) => x.id !== target.id))
      setTarget(null)
      setReloadToken((n) => n + 1)
    } catch (err) {
      toast.error((err as { pastoralMessage?: string })?.pastoralMessage ?? "Falha ao desbloquear.")
    } finally {
      setBusy(false)
    }
  }

  const campo = (k: keyof typeof busca, label: string, type = "text") => (
    <div className="flex-1 min-w-[180px]">
      <Label htmlFor={`bl-${k}`} className="text-xs uppercase tracking-wider text-clama-gold/80">
        {label}
      </Label>
      <Input
        id={`bl-${k}`}
        type={type}
        autoComplete="off"
        value={busca[k]}
        onChange={(e) => setBusca((b) => ({ ...b, [k]: e.target.value }))}
        className="mt-1 bg-clama-night border-clama-gold/30 text-clama-cream"
      />
    </div>
  )

  const tabela = (rows: Bloqueio[], vazio: string) => (
    <div className="overflow-x-auto rounded-md border border-clama-gold/20">
      <table className="w-full text-left text-sm">
        <thead className="bg-clama-night-deep text-clama-cream/70">
          <tr>
            <th className="p-3">Bloqueado em</th>
            <th className="p-3">Hash do e-mail</th>
            <th className="p-3">Hash do CPF</th>
            <th className="p-3">IP</th>
            <th className="p-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-clama-cream/60">{vazio}</td>
            </tr>
          )}
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-clama-gold/10">
              <td className="p-3 text-clama-cream/60">{b.criadoEm ? fmt(b.criadoEm) : "—"}</td>
              <td className="p-3 font-mono text-xs text-clama-cream">{b.emailHmacCurto}</td>
              <td className="p-3 font-mono text-xs text-clama-cream">{b.cpfHmacCurto}</td>
              <td className="p-3 text-clama-cream/80">{b.temIp ? "Sim" : "Não"}</td>
              <td className="p-3 text-right">
                <Button variant="outline" size="sm" onClick={() => setTarget(b)}
                  className="border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10">
                  <LockOpen className="h-3.5 w-3.5 mr-1" />
                  Desbloquear
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-2xl text-clama-gold">Bloqueio do freemium</h1>
        <p className="text-sm text-clama-cream/60">
          Quem já usou a oração gratuita e não pode pedir outra. Os dados aparecem só como hash truncado.
        </p>
      </header>

      <form
        onSubmit={buscar}
        className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3"
      >
        {campo("email", "E-mail", "email")}
        {campo("cpfCnpj", "CPF/CNPJ")}
        <Button type="submit" disabled={buscando}>
          <Search className="h-4 w-4 mr-1" />
          {buscando ? "Buscando…" : "Buscar bloqueio"}
        </Button>
      </form>

      {achados && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[2px] text-clama-gold">Resultado da busca</h2>
          {tabela(achados, "Nenhum bloqueio encontrado para esses dados.")}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[2px] text-clama-gold">
          Todos os bloqueios {data ? `(${total})` : ""}
        </h2>
        {error && <PastoralAlert variant="error">{error}</PastoralAlert>}
        {loading ? (
          <div className="flex justify-center p-6"><LoadingSpinner size={20} /></div>
        ) : (
          !error && tabela(data?.content ?? [], "Nenhum bloqueio.")
        )}
        <AdminPager offset={offset} total={total} onChange={setOffset} />
      </section>

      <Dialog open={!!target} onOpenChange={(open) => !open && !busy && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desbloquear freemium?</DialogTitle>
            <DialogDescription>
              Quem tem o bloqueio {target?.emailHmacCurto} poderá pedir uma oração gratuita novamente. Se a pessoa já
              tiver conta, o pedido continua dando "conta existente". A ação fica registrada na auditoria e não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={desbloquear} disabled={busy}>
              {busy ? "Desbloqueando…" : "Confirmar desbloqueio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

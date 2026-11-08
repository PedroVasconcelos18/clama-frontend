import { useState } from "react"
import { toast } from "sonner"
import { LockOpen, Search } from "lucide-react"

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
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { cn } from "@/lib/utils"
import type { AdminFreemiumBloqueio, AdminFreemiumToken } from "@/types/admin.types"

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR") : "—")
const sim = (b: boolean) => (b ? "Sim" : "Não")

export default function FreemiumBloqueiosPage() {
  const [aba, setAba] = useState<"bloqueios" | "tokens">("bloqueios")
  const tab = (id: typeof aba, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={aba === id}
      onClick={() => setAba(id)}
      className={cn(
        "px-4 py-2 text-sm border-b-2",
        aba === id
          ? "border-clama-gold text-clama-gold"
          : "border-transparent text-clama-cream/60 hover:text-clama-cream",
      )}
    >
      {label}
    </button>
  )
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-2xl text-clama-gold">Bloqueio do freemium</h1>
        <p className="text-sm text-clama-cream/60">
          Quem já usou a oração gratuita e não pode pedir outra. Os dados aparecem só como hash truncado.
        </p>
      </header>
      <div role="tablist" className="flex border-b border-clama-gold/20">
        {tab("bloqueios", "Bloqueios")}
        {tab("tokens", "Tokens de confirmação")}
      </div>
      {aba === "bloqueios" ? <Bloqueios /> : <Tokens />}
    </div>
  )
}

function Bloqueios() {
  const { fetchApi } = useApi()
  const [offset, setOffset] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [busca, setBusca] = useState({ email: "", cpf_cnpj: "", telefone: "" })
  const [achados, setAchados] = useState<AdminFreemiumBloqueio[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [target, setTarget] = useState<AdminFreemiumBloqueio | null>(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = useAdminList<AdminFreemiumBloqueio>(
    "/api/admin/freemium/bloqueios/",
    {},
    offset,
    reloadToken,
  )

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    // os valores em claro só vão no corpo do POST, nunca na URL nem em log
    const corpo = Object.fromEntries(
      Object.entries(busca)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v),
    )
    if (Object.keys(corpo).length === 0) {
      toast.error("Informe e-mail, CPF/CNPJ ou telefone.")
      return
    }
    setBuscando(true)
    try {
      setAchados(
        await fetchApi<AdminFreemiumBloqueio[]>("/api/admin/freemium/bloqueios/buscar/", {
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
      await fetchApi(`/api/admin/freemium/bloqueios/${target.id}/`, {
        method: "DELETE",
        showToast: false,
      })
      toast.success("Bloqueio removido.")
      setAchados((a) => a && a.filter((x) => x.id !== target.id))
      setTarget(null)
      setReloadToken((n) => n + 1)
    } catch (err) {
      toast.error(
        (err as { pastoralMessage?: string })?.pastoralMessage ?? "Falha ao desbloquear.",
      )
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

  const tabela = (rows: AdminFreemiumBloqueio[], vazio: string) => (
    <div className="overflow-x-auto rounded-md border border-clama-gold/20">
      <table className="w-full text-left text-sm">
        <thead className="bg-clama-night-deep text-clama-cream/70">
          <tr>
            <th className="p-3">Bloqueado em</th>
            <th className="p-3">Hash do e-mail</th>
            <th className="p-3">Hash do CPF</th>
            <th className="p-3">Telefone</th>
            <th className="p-3">Dispositivo</th>
            <th className="p-3">IP</th>
            <th className="p-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-clama-cream/60">{vazio}</td>
            </tr>
          )}
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-clama-gold/10">
              <td className="p-3 text-clama-cream/60">{fmt(b.created_at)}</td>
              <td className="p-3 font-mono text-xs text-clama-cream">{b.email_hash_curto}</td>
              <td className="p-3 font-mono text-xs text-clama-cream">{b.cpf_hash_curto}</td>
              <td className="p-3 text-clama-cream/80">{sim(b.tem_telefone)}</td>
              <td className="p-3 text-clama-cream/80">{sim(b.tem_device)}</td>
              <td className="p-3 text-clama-cream/80">{sim(b.tem_ip)}</td>
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
      <form
        onSubmit={buscar}
        className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3"
      >
        {campo("email", "E-mail", "email")}
        {campo("cpf_cnpj", "CPF/CNPJ")}
        {campo("telefone", "Telefone")}
        <Button type="submit" disabled={buscando}>
          <Search className="h-4 w-4 mr-1" />
          {buscando ? "Buscando…" : "Buscar bloqueio"}
        </Button>
      </form>

      {achados && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[2px] text-clama-gold">
            Resultado da busca
          </h2>
          {tabela(achados, "Nenhum bloqueio encontrado para esses dados.")}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[2px] text-clama-gold">
          Todos os bloqueios {data ? `(${data.count})` : ""}
        </h2>
        {error && <PastoralAlert variant="error">{error}</PastoralAlert>}
        {loading ? (
          <div className="flex justify-center p-6"><LoadingSpinner size={20} /></div>
        ) : (
          !error && tabela(data?.results ?? [], "Nenhum bloqueio.")
        )}
        <AdminPager offset={offset} total={data?.count ?? 0} onChange={setOffset} />
      </section>

      <Dialog open={!!target} onOpenChange={(open) => !open && !busy && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desbloquear freemium?</DialogTitle>
            <DialogDescription>
              Quem tem o bloqueio {target?.email_hash_curto} poderá pedir uma oração gratuita
              novamente. A ação fica registrada na auditoria e não pode ser desfeita.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function estadoDoToken(t: AdminFreemiumToken): string {
  if (t.used_at) return "usado"
  return new Date(t.expires_at).getTime() <= Date.now() ? "expirado" : "válido"
}

function Tokens() {
  const [offset, setOffset] = useState(0)
  const [pedidoIn, setPedidoIn] = useState("")
  const [pedido, setPedido] = useState("")
  const { data, loading, error } = useAdminList<AdminFreemiumToken>(
    "/api/admin/freemium/tokens/",
    { pedido },
    offset,
  )
  const rows = data?.results ?? []

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    const v = pedidoIn.trim()
    if (v && !UUID_RE.test(v)) {
      toast.error("Informe o id do pedido completo (UUID).")
      return
    }
    setPedido(v)
    setOffset(0)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={buscar}
        className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3">
        <div className="flex-1 min-w-[260px]">
          <Label htmlFor="tk-pedido" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Id do pedido
          </Label>
          <Input id="tk-pedido" value={pedidoIn} onChange={(e) => setPedidoIn(e.target.value)}
            autoComplete="off" className="mt-1 bg-clama-night border-clama-gold/30 text-clama-cream" />
        </div>
        <Button type="submit">
          <Search className="h-4 w-4 mr-1" />
          Buscar token
        </Button>
      </form>
      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}
      <div className="overflow-x-auto rounded-md border border-clama-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-clama-night-deep text-clama-cream/70">
            <tr>
              <th className="p-3">Token</th>
              <th className="p-3">Pedido</th>
              <th className="p-3">Criado em</th>
              <th className="p-3">Expira em</th>
              <th className="p-3">Usado em</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="p-6 text-center"><LoadingSpinner size={20} /></td></tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-clama-cream/60">Nenhum token.</td></tr>
            )}
            {!loading &&
              rows.map((t) => (
                <tr key={t.id} className="border-t border-clama-gold/10">
                  <td className="p-3 font-mono text-xs text-clama-cream">{t.token_curto}</td>
                  <td className="p-3 font-mono text-xs text-clama-cream/60">{t.pedido_id.slice(0, 8)}</td>
                  <td className="p-3 text-clama-cream/60">{fmt(t.created_at)}</td>
                  <td className="p-3 text-clama-cream/60">{fmt(t.expires_at)}</td>
                  <td className="p-3 text-clama-cream/60">{fmt(t.used_at)}</td>
                  <td className="p-3 text-clama-cream/80">{estadoDoToken(t)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <AdminPager offset={offset} total={data?.count ?? 0} onChange={setOffset} />
    </div>
  )
}

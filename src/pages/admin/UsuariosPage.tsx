import { useEffect, useState } from "react"
import { Search } from "lucide-react"

import { useApi } from "@/hooks/useApi"
import { useSessao } from "@/contexts/SessaoContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AdminPager } from "@/components/admin/AdminPager"
import { CustomerDetailDrawer } from "@/components/admin/CustomerDetailDrawer"
import { NovoAdminDialog } from "@/components/admin/NovoAdminDialog"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PAGE_SIZE } from "@/hooks/useAdminList"
import { formatarData, formatarDataHora } from "@/lib/datetime"
import { ROTULO_PAPEL, type PaginaDeUsuarios } from "@/types/usuario-admin"

const COLUNAS = 7

const selectClass =
  "mt-1 block bg-clama-night border border-clama-gold/30 text-clama-cream rounded-md h-9 px-2 text-sm"

/**
 * Lista de usuários. Contagens de pedidos e comentários e bans voltam com as
 * ondas 4 e 6 (hoje o servidor não as tem). Escrita só para SUPERUSUARIO.
 */
export default function UsuariosPage() {
  const { fetchApi } = useApi()
  const { usuario } = useSessao()
  const souSuperusuario = usuario?.papel === "SUPERUSUARIO"

  const [data, setData] = useState<PaginaDeUsuarios | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [q, setQ] = useState("")
  const [papel, setPapel] = useState("")
  const [ativo, setAtivo] = useState("")
  const [offset, setOffset] = useState(0)
  const [novoAdmin, setNovoAdmin] = useState(false)
  const [detalheId, setDetalheId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(offset / PAGE_SIZE), size: String(PAGE_SIZE) })
    if (q.trim()) params.set("q", q.trim())
    if (papel) params.set("papel", papel)
    if (ativo) params.set("ativo", ativo)

    fetchApi<PaginaDeUsuarios>(`/api/admin/usuarios?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err: { pastoralMessage?: string }) => {
        if (!cancelled) setError(err?.pastoralMessage ?? "Não foi possível carregar os usuários.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchApi, q, papel, ativo, offset, reloadToken])

  // Filtro novo volta para a primeira página.
  const filtrar = (aplicar: () => void) => {
    aplicar()
    setOffset(0)
  }

  const usuarios = data?.content ?? []
  const total = data?.page.totalElements ?? 0

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-clama-gold">Usuários</h1>
          <p className="text-sm text-clama-cream/60">Todas as contas do Clama.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-clama-cream/60">{total} no total</span>
          {souSuperusuario && (
            <Button size="sm" onClick={() => setNovoAdmin(true)}>
              Novo admin
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3">
        <div className="flex-1 min-w-[220px]">
          <Label htmlFor="usr-q" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Buscar
          </Label>
          <div className="relative mt-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-clama-cream/40" />
            <Input
              id="usr-q"
              value={q}
              onChange={(e) => filtrar(() => setQ(e.target.value))}
              placeholder="e-mail ou nome"
              className="pl-8 bg-clama-night border-clama-gold/30 text-clama-cream"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="usr-papel" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Papel
          </Label>
          <select
            id="usr-papel"
            value={papel}
            onChange={(e) => filtrar(() => setPapel(e.target.value))}
            className={selectClass}
          >
            <option value="">Todos</option>
            <option value="CLIENTE">Cliente</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPERUSUARIO">Superusuário</option>
          </select>
        </div>
        <div>
          <Label htmlFor="usr-ativo" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Situação
          </Label>
          <select
            id="usr-ativo"
            value={ativo}
            onChange={(e) => filtrar(() => setAtivo(e.target.value))}
            className={selectClass}
          >
            <option value="">Todas</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-clama-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-clama-night-deep text-clama-cream/70">
            <tr>
              <th className="p-3">E-mail</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Papel</th>
              <th className="p-3">Cadastro</th>
              <th className="p-3">Último login</th>
              <th className="p-3">Situação</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={COLUNAS} className="p-6 text-center">
                  <LoadingSpinner size={20} />
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={COLUNAS} className="p-6 text-center text-red-300">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && usuarios.length === 0 && (
              <tr>
                <td colSpan={COLUNAS} className="p-6 text-center text-clama-cream/60">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              usuarios.map((u) => (
                <tr key={u.id} className="border-t border-clama-gold/10 hover:bg-clama-night-soft/40">
                  <td className="p-3 text-clama-cream">{u.email}</td>
                  <td className="p-3 text-clama-cream/80">{u.nomeCompleto || "—"}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-clama-gold/15 px-2 py-0.5 text-xs text-clama-gold">
                      {u.papel ? ROTULO_PAPEL[u.papel] : "—"}
                    </span>
                  </td>
                  <td className="p-3 text-clama-cream/70">{formatarData(u.criadoEm)}</td>
                  <td className="p-3 text-clama-cream/70">{formatarDataHora(u.ultimoLoginEm)}</td>
                  <td className="p-3 text-clama-cream/70">
                    {u.ativo ? "Ativa" : "Inativa"}
                    {!u.temSenha && " · sem senha"}
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setDetalheId(u.id)}>
                      Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <AdminPager offset={offset} total={total} onChange={setOffset} />

      <CustomerDetailDrawer
        usuarioId={detalheId}
        onClose={() => setDetalheId(null)}
        onChanged={() => setReloadToken((n) => n + 1)}
      />

      {souSuperusuario && (
        <NovoAdminDialog
          open={novoAdmin}
          onClose={() => setNovoAdmin(false)}
          onCreated={() => setReloadToken((n) => n + 1)}
        />
      )}
    </div>
  )
}

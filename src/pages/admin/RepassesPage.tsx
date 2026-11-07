import { useState } from "react"
import { Search } from "lucide-react"

import { useAdminList } from "@/hooks/useAdminList"
import { AdminPager } from "@/components/admin/AdminPager"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import type { AdminRepasse } from "@/types/admin.types"

const reais = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const data = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "—"

export default function RepassesPage() {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [offset, setOffset] = useState(0)
  const { data: page, loading, error } = useAdminList<AdminRepasse>(
    "/api/admin/repasses/",
    { q, status },
    offset,
  )
  const rows = page?.results ?? []
  const total = page?.count ?? 0

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-clama-gold">Repasses</h1>
          <p className="text-sm text-clama-cream/60">
            Parte de cada pedido pago destinada às instituições (somente leitura).
          </p>
        </div>
        <span className="text-sm text-clama-cream/60">{total} no total</span>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3">
        <div className="flex-1 min-w-[220px]">
          <Label htmlFor="rep-q" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Instituição
          </Label>
          <div className="relative mt-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-clama-cream/40" />
            <Input
              id="rep-q"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setOffset(0)
              }}
              placeholder="nome da instituição"
              className="pl-8 bg-clama-night border-clama-gold/30 text-clama-cream"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="rep-status" className="text-xs uppercase tracking-wider text-clama-gold/80">
            Status
          </Label>
          <select
            id="rep-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setOffset(0)
            }}
            className="mt-1 block bg-clama-night border border-clama-gold/30 text-clama-cream rounded-md h-9 px-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="registrado">Registrado</option>
            <option value="transferido">Transferido</option>
          </select>
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
              <th className="p-3">Transferido em</th>
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
                  Nenhum repasse encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-t border-clama-gold/10">
                  <td className="p-3 text-clama-cream/60">{data(r.created_at)}</td>
                  <td className="p-3 text-clama-cream">{r.instituicao_nome}</td>
                  <td className="p-3 font-mono text-xs text-clama-cream/60">
                    {r.pedido_id.slice(0, 8)}
                  </td>
                  <td className="p-3 text-right text-clama-cream/80">
                    {reais(r.valor_base_centavos)}
                  </td>
                  <td className="p-3 text-right text-clama-cream/80">{r.percentual}%</td>
                  <td className="p-3 text-right text-clama-cream">{reais(r.valor_centavos)}</td>
                  <td className="p-3 text-clama-cream/80">
                    {r.status === "transferido" ? "Transferido" : "Registrado"}
                  </td>
                  <td className="p-3 text-clama-cream/60">{data(r.transferido_em)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <AdminPager offset={offset} total={total} onChange={setOffset} />
    </div>
  )
}

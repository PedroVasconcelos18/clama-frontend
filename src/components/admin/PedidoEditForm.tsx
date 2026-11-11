import { useState } from "react"
import { toast } from "sonner"
import { useApi } from "@/hooks/useApi"
import { PastoralApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import type { AdminPedidoDetalhe } from "@/types/admin.types"

const SELECT =
  "mt-1 block w-full bg-clama-night border border-clama-gold/30 text-clama-cream rounded-md h-9 px-2 text-sm"

const ROTULOS: Record<string, string> = {
  nome: "Nome", email: "E-mail", telefone: "Telefone", idade: "Idade", sexo: "Sexo", pedidoOracao: "Pedido de oração",
}

/**
 * Correção de dados do pedido (D22): nome, e-mail, telefone, idade, sexo e texto.
 * Status, plano, valor e canal não mudam por aqui. Campo vazio = não muda, exceto o
 * telefone, que a API apaga quando chega em branco.
 */
export function PedidoEditForm({
  pedido,
  onSaved,
  onCancel,
}: {
  pedido: AdminPedidoDetalhe
  onSaved: (p: AdminPedidoDetalhe) => void
  onCancel: () => void
}) {
  const { fetchApi } = useApi()
  const inicial = {
    nome: pedido.nome ?? "",
    email: pedido.email ?? "",
    telefone: pedido.telefone ?? "",
    idade: pedido.idade == null ? "" : String(pedido.idade),
    sexo: pedido.sexo ?? "",
    pedidoOracao: pedido.pedidoOracao ?? "",
  }
  const [f, setF] = useState(inicial)
  const [erro, setErro] = useState<string | null>(null)
  const [erroIdade, setErroIdade] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const txt = (k: keyof typeof inicial) => (e: { target: { value: string } }) =>
    setF((cur) => ({ ...cur, [k]: e.target.value }))

  async function salvar() {
    // número inválido nunca vai ao servidor
    const idadeInvalida = f.idade.trim() !== "" && !/^\d+$/.test(f.idade.trim())
    setErroIdade(idadeInvalida ? "Use só dígitos." : null)
    if (idadeInvalida) return
    // PATCH parcial: manda só o que mudou
    const corpo: Record<string, unknown> = {}
    for (const k of Object.keys(inicial) as (keyof typeof inicial)[]) {
      if (f[k] === inicial[k]) continue
      if (k === "idade") {
        if (f.idade.trim() !== "") corpo.idade = Number(f.idade)
      } else if (k === "telefone" || f[k].trim() !== "") corpo[k] = f[k]
    }
    if (Object.keys(corpo).length === 0) {
      onCancel()
      return
    }
    setSaving(true)
    setErro(null)
    try {
      const salvo = await fetchApi<AdminPedidoDetalhe>(`/api/admin/pedidos/${pedido.id}`, {
        method: "PATCH",
        body: JSON.stringify(corpo),
        showToast: false,
      })
      toast.success("Pedido atualizado.")
      onSaved(salvo)
    } catch (err) {
      const e = err as PastoralApiError
      const porCampo = Object.entries(e.campos ?? {}).map(([c, m]) => `${ROTULOS[c] ?? c}: ${m}`)
      const msg = porCampo.length ? porCampo.join(" ") : (e.pastoralMessage ?? "Não foi possível salvar o pedido.")
      setErro(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void salvar()
      }}
    >
      <div>
        <Label htmlFor="ped-nome">Nome</Label>
        <Input id="ped-nome" value={f.nome} onChange={txt("nome")} />
      </div>
      <div>
        <Label htmlFor="ped-email">E-mail</Label>
        <Input id="ped-email" value={f.email} onChange={txt("email")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ped-telefone">Telefone</Label>
          <Input id="ped-telefone" value={f.telefone} onChange={txt("telefone")} />
        </div>
        <div>
          <Label htmlFor="ped-idade">Idade</Label>
          <Input id="ped-idade" inputMode="numeric" value={f.idade} onChange={txt("idade")} />
          {erroIdade && <p className="text-xs text-red-300">{erroIdade}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="ped-sexo">Sexo</Label>
        <select id="ped-sexo" className={SELECT} value={f.sexo} onChange={txt("sexo")}>
          <option value="" disabled>
            Não informado
          </option>
          <option value="feminino">Feminino</option>
          <option value="masculino">Masculino</option>
          <option value="nao_informado">Prefere não informar</option>
        </select>
      </div>
      <div>
        <Label htmlFor="ped-pedido">Pedido de oração</Label>
        <Textarea id="ped-pedido" rows={4} value={f.pedidoOracao} onChange={txt("pedidoOracao")} />
      </div>
      {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

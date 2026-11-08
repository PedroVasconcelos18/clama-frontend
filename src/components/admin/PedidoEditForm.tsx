import { useState } from "react"
import { toast } from "sonner"
import { useApi } from "@/hooks/useApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { PEDIDO_STATUS } from "@/lib/pedido-status"
import type { AdminPedido } from "@/types/admin.types"

const SELECT =
  "mt-1 block w-full bg-clama-night border border-clama-gold/30 text-clama-cream rounded-md h-9 px-2 text-sm"

const ROTULOS: Record<string, string> = {
  nome: "Nome", email: "E-mail", telefone: "Telefone", idade: "Idade", sexo: "Sexo",
  pedido_oracao: "Pedido de oração", oracao_gerada: "Oração gerada", valor_centavos: "Valor",
  canal_entrega: "Canal", status: "Status",
}

/** Edição do PedidoAdmin do Django: só os campos editáveis; plano, pagamento e datas ficam de fora. */
export function PedidoEditForm({
  pedido,
  onSaved,
  onCancel,
}: {
  pedido: AdminPedido
  onSaved: (p: AdminPedido) => void
  onCancel: () => void
}) {
  const { fetchApi } = useApi()
  const inicial = {
    nome: pedido.nome,
    email: pedido.email,
    telefone: pedido.telefone ?? "",
    idade: pedido.idade == null ? "" : String(pedido.idade),
    sexo: pedido.sexo ?? "",
    pedido_oracao: pedido.pedido_oracao,
    oracao_gerada: pedido.oracao_gerada ?? "",
    valor_centavos: String(pedido.valor_centavos),
    canal_entrega: pedido.canal_entrega as string,
    status: pedido.status,
  }
  const [f, setF] = useState(inicial)
  const [erro, setErro] = useState<string | null>(null)
  const [errosCampo, setErrosCampo] = useState<Partial<Record<"idade" | "valor_centavos", string>>>({})
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof inicial) => (v: string) => setF((cur) => ({ ...cur, [k]: v }))
  const txt = (k: keyof typeof inicial, e: { target: { value: string } }) => set(k)(e.target.value)

  async function salvar() {
    // número inválido nunca vai ao servidor (Number("abc") viraria null no JSON e apagaria a idade)
    const invalidos: typeof errosCampo = {}
    if (f.idade.trim() !== "" && !/^\d+$/.test(f.idade.trim())) invalidos.idade = "Use só dígitos."
    if (!/^\d+$/.test(f.valor_centavos.trim())) invalidos.valor_centavos = "Use só dígitos (centavos)."
    setErrosCampo(invalidos)
    if (Object.keys(invalidos).length > 0) return
    // PATCH parcial: manda só o que mudou
    const corpo: Record<string, unknown> = {}
    for (const k of Object.keys(inicial) as (keyof typeof inicial)[]) {
      if (f[k] === inicial[k]) continue
      if (k === "idade") corpo[k] = f[k].trim() === "" ? null : Number(f[k])
      else if (k === "valor_centavos") corpo[k] = Number(f[k])
      else corpo[k] = f[k]
    }
    if (Object.keys(corpo).length === 0) {
      onCancel()
      return
    }
    setSaving(true)
    setErro(null)
    try {
      const salvo = await fetchApi<AdminPedido>(`/api/admin/pedidos/${pedido.id}/`, {
        method: "PATCH",
        body: JSON.stringify(corpo),
        showToast: false,
      })
      toast.success("Pedido atualizado.")
      onSaved(salvo)
    } catch (err) {
      const base = (err as { pastoralMessage?: string })?.pastoralMessage ?? "Não foi possível salvar o pedido."
      if ((err as { httpStatus?: number })?.httpStatus === 409) {
        // pagamento_pendente: a mensagem pastoral já explica, sem rótulo de campo
        setErro(base)
        toast.error(base)
        return
      }
      // o servidor devolve só o texto; com um campo só, o rótulo dele identifica a origem
      const campos = Object.keys(corpo)
      const msg = campos.length === 1 && campos[0] ? `${ROTULOS[campos[0]] ?? campos[0]}: ${base}` : base
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
        <Input id="ped-nome" value={f.nome} onChange={(e) => txt("nome", e)} />
      </div>
      <div>
        <Label htmlFor="ped-email">E-mail</Label>
        <Input id="ped-email" value={f.email} onChange={(e) => txt("email", e)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ped-telefone">Telefone</Label>
          <Input id="ped-telefone" value={f.telefone} onChange={(e) => txt("telefone", e)} />
        </div>
        <div>
          <Label htmlFor="ped-idade">Idade</Label>
          <Input id="ped-idade" inputMode="numeric" value={f.idade} onChange={(e) => txt("idade", e)} />
          {errosCampo.idade && <p className="text-xs text-red-300">{errosCampo.idade}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ped-sexo">Sexo</Label>
          <select id="ped-sexo" className={SELECT} value={f.sexo} onChange={(e) => txt("sexo", e)}>
            <option value="">Não informado</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
            <option value="nao_informado">Prefere não informar</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ped-canal">Canal</Label>
          <select id="ped-canal" className={SELECT} value={f.canal_entrega} onChange={(e) => txt("canal_entrega", e)}>
            <option value="email">E-mail</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="ped-valor">Valor (centavos)</Label>
        <Input id="ped-valor" inputMode="numeric" value={f.valor_centavos} onChange={(e) => txt("valor_centavos", e)} />
        {errosCampo.valor_centavos && <p className="text-xs text-red-300">{errosCampo.valor_centavos}</p>}
      </div>
      <div>
        <Label htmlFor="ped-pedido">Pedido de oração</Label>
        <Textarea id="ped-pedido" rows={4} value={f.pedido_oracao} onChange={(e) => txt("pedido_oracao", e)} />
      </div>
      <div>
        <Label htmlFor="ped-oracao">Oração gerada</Label>
        <Textarea id="ped-oracao" rows={6} value={f.oracao_gerada} onChange={(e) => txt("oracao_gerada", e)} />
      </div>
      <div>
        <Label htmlFor="ped-status">Status</Label>
        <select id="ped-status" className={SELECT} value={f.status} onChange={(e) => txt("status", e)}>
          {PEDIDO_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {f.status !== inicial.status && (
        <PastoralAlert variant="info">
          Mudar o status à mão não enfileira nenhum job (não gera oração, não envia, não cobra). Um pedido deixado
          num estado que o fluxo não espera pode ser marcado depois como pedido preso.
          {inicial.status === "aguardando_pagamento" &&
            " Sair de “aguardando pagamento” à mão é recusado: para entregar sem pagamento use Marcar gratuito; se o pagamento já caiu, reprocesse o webhook."}
        </PastoralAlert>
      )}
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

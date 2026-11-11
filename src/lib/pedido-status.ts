import type { StatusPedido } from "@/types/pedido-status.types"

/** Valores do `StatusPedido` da API, na ordem do fluxo. */
export const PEDIDO_STATUS: { value: StatusPedido; label: string }[] = [
  { value: "AGUARDANDO_PAGAMENTO", label: "Aguardando pagamento" },
  { value: "PAGO", label: "Pago" },
  { value: "GERANDO_ORACAO", label: "Gerando oração" },
  { value: "ORACAO_GERADA", label: "Oração gerada" },
  { value: "ENVIADA", label: "Enviada" },
  { value: "AGUARDANDO_NOVA_TENTATIVA", label: "Aguardando nova tentativa" },
  { value: "ERRO", label: "Erro" },
]

export const rotuloDoStatus = (s?: string) => PEDIDO_STATUS.find((o) => o.value === s)?.label ?? s ?? "—"

export const PEDIDO_STATUS_COLORS: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "bg-yellow-500/20 text-yellow-400",
  PAGO: "bg-green-500/20 text-green-400",
  GERANDO_ORACAO: "bg-blue-500/20 text-blue-400",
  ORACAO_GERADA: "bg-blue-500/20 text-blue-400",
  ENVIADA: "bg-green-500/20 text-green-400",
  AGUARDANDO_NOVA_TENTATIVA: "bg-yellow-500/20 text-yellow-400",
  ERRO: "bg-red-500/20 text-red-400",
}

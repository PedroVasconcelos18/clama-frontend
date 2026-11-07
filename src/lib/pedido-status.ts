/** Valores do model (StatusPedido). O de "enviada" é `enviada`, não `oracao_enviada`. */
export const PEDIDO_STATUS = [
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "aguardando_confirmacao_email", label: "Aguardando confirmação de e-mail" },
  { value: "pago", label: "Pago" },
  { value: "gerando_oracao", label: "Gerando oração" },
  { value: "oracao_gerada", label: "Oração gerada" },
  { value: "enviada", label: "Enviada" },
  { value: "aguardando_reenvio", label: "Aguardando reenvio" },
  { value: "erro", label: "Erro" },
] as const

export const PEDIDO_STATUS_COLORS: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-500/20 text-yellow-400",
  aguardando_confirmacao_email: "bg-yellow-500/20 text-yellow-400",
  pago: "bg-green-500/20 text-green-400",
  gerando_oracao: "bg-blue-500/20 text-blue-400",
  oracao_gerada: "bg-blue-500/20 text-blue-400",
  enviada: "bg-green-500/20 text-green-400",
  erro: "bg-red-500/20 text-red-400",
  aguardando_reenvio: "bg-yellow-500/20 text-yellow-400",
}

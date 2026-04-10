export type PedidoStatusValue =
  | "aguardando_pagamento"
  | "pago"
  | "gerando_oracao"
  | "oracao_gerada"
  | "enviada"
  | "aguardando_reenvio"
  | "erro";

export interface PedidoStatus {
  id: string;
  status: PedidoStatusValue;
  canal_entrega: "email" | "whatsapp";
}

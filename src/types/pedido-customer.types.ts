/**
 * Tipo do pedido retornado por `GET /api/customer/pedidos/` — subset
 * seguro do `Pedido` do backend, sem PII redundante.
 */

import type { PedidoStatusValue } from "./pedido-status.types";

export interface CustomerPedido {
  id: string;
  status: PedidoStatusValue | "aguardando_confirmacao_email";
  plano: string;
  valor_reais_str: string;
  valor_centavos: number;
  eh_gratuito: boolean;
  canal_entrega: "email" | "whatsapp";
  created_at: string;
  oracao_gerada: string | null;
}

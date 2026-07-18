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
  pastoral_message?: string | null;
  oracao_gerada?: string | null;
  /** Pix copia-e-cola (presente enquanto aguardando_pagamento). */
  pix_qr_code?: string | null;
  /** Imagem do QR Pix em PNG base64 (sem o prefixo data:). */
  pix_qr_code_base64?: string | null;
}

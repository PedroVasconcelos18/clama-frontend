import { apiFetch } from "@/lib/api";
import type { PedidoFormData } from "@/lib/schemas/pedido";
import type { components } from "@/types/api-schema";
import type { PedidoCriado } from "@/types/pedido-status.types";

type NovoPedidoGerado = components["schemas"]["NovoPedido"];

// TODO(T11): trocar pelo tipo gerado do OpenAPI (sem idade, sexo e telefone; com tema)
export type CorpoDoPedido = Omit<NovoPedidoGerado, "idade" | "sexo" | "telefone"> & {
  tema?: string;
};

/**
 * Corpo comum de `POST /api/pedidos`, `/api/pedidos/gratuito`, `/api/doacoes` e
 * `/api/freemium/pedidos` (camelCase). `valorCentavos` e `instituicao` só entram no pago;
 * o `turnstileToken`, só no anônimo.
 */
export function corpoDoPedido(
  d: PedidoFormData,
  clamor: { texto: string; tema: string | null },
): CorpoDoPedido {
  return {
    nome: d.nome,
    email: d.email,
    cpfCnpj: d.cpf_cnpj,
    pedidoOracao: clamor.texto,
    tema: clamor.tema ?? undefined,
    consentAceito: d.consent_aceito,
  };
}

/**
 * Doação paga SEM conta: `POST /api/doacoes` (anônimo, CSRF, Turnstile validado uma vez, aqui).
 * Cria o pedido em `AGUARDANDO_PAGAMENTO`; o Pix é pedido pela tela de confirmação.
 */
export function criarDoacaoAnonima(corpo: CorpoDoPedido, turnstileToken: string): Promise<PedidoCriado> {
  return apiFetch<PedidoCriado>("/api/doacoes", {
    method: "POST",
    body: JSON.stringify({ ...corpo, turnstileToken }),
    showToast: false,
  });
}

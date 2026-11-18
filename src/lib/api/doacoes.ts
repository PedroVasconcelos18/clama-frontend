import { apiFetch } from "@/lib/api";
import type { PedidoFormData } from "@/lib/schemas/pedido";
import type { components } from "@/types/api-schema";
import type { PedidoCriado } from "@/types/pedido-status.types";

/** O front da v2 não envia idade, sexo nem telefone (ainda aceitos pela API). */
export type CorpoDoPedido = Omit<components["schemas"]["NovoPedido"], "idade" | "sexo" | "telefone">;

/**
 * Corpo comum de `POST /api/pedidos`, `/api/pedidos/gratuito`, `/api/doacoes` e
 * `/api/freemium/pedidos` (camelCase). `valorCentavos` e `instituicao` só entram no pago;
 * o `turnstileToken`, só no anônimo.
 */
export function corpoDoPedido(
  d: PedidoFormData,
  clamor: { texto: string; tema: string | null; consentAceito: boolean },
): CorpoDoPedido {
  return {
    nome: d.nome,
    email: d.email,
    cpfCnpj: d.cpf_cnpj,
    pedidoOracao: clamor.texto,
    tema: clamor.tema ?? undefined,
    consentAceito: clamor.consentAceito,
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

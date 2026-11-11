import { apiFetch } from "@/lib/api";
import type { PedidoGratuitoData } from "@/lib/schemas/pedido-gratuito";
import type { PedidoFormData } from "@/lib/schemas/pedido";
import type { components } from "@/types/api-schema";
import type { PedidoCriado } from "@/types/pedido-status.types";

type NovoPedido = components["schemas"]["NovoPedido"];

/**
 * Corpo comum de `POST /api/pedidos`, `/api/pedidos/gratuito` e `/api/doacoes`
 * (camelCase, sem canal de entrega). Os campos vazios ficam de fora (o
 * `JSON.stringify` descarta `undefined`): telefone, sexo e o texto do pedido
 * são opcionais na API.
 */
export function corpoDoPedido(d: PedidoFormData | PedidoGratuitoData): NovoPedido {
  return {
    nome: d.nome,
    email: d.email,
    cpfCnpj: d.cpf_cnpj,
    telefone: d.telefone || undefined,
    idade: d.idade,
    sexo: d.sexo || undefined,
    pedidoOracao: d.pedido_oracao || undefined,
    consentAceito: d.consent_aceito,
  };
}

/**
 * Doação paga SEM conta (Landing pública): `POST /api/doacoes` (anônimo, CSRF,
 * Turnstile validado uma vez, aqui). Cria o pedido em `AGUARDANDO_PAGAMENTO`;
 * o Pix é pedido pela tela de confirmação (`POST /api/pedidos/{id}/pix`).
 */
export async function criarDoacaoAnonima(
  dados: PedidoGratuitoData,
  valorCentavos: number,
  instituicao: number | null,
): Promise<PedidoCriado> {
  const corpo: NovoPedido = {
    ...corpoDoPedido(dados),
    valorCentavos,
    instituicao: instituicao ?? undefined,
    turnstileToken: dados.turnstile_token,
  };
  return apiFetch<PedidoCriado>("/api/doacoes", {
    method: "POST",
    body: JSON.stringify(corpo),
    showToast: false,
  });
}

import { apiFetch } from "@/lib/api";
import type { DoacaoData } from "@/lib/schemas/doacao";

/**
 * Wrappers da doação paga SEM conta (Landing pública) — Objetivo 2.
 *
 * Fluxo:
 *   1. `criarDoacaoAnonima` — POST `/api/doacoes/` (AllowAny). Backend valida
 *      Turnstile no corpo da view, throttle por IP e device_hash, e cria um
 *      Pedido anônimo (`user=None`) em `AGUARDANDO_PAGAMENTO`. Retorna o pedido
 *      criado (com `id`).
 *   2. `gerarCheckout` — POST `/api/pedidos/<id>/checkout/` (AllowAny). Gera o
 *      Pix (backend cria o pagamento e salva o QR no pedido). O QR é exibido
 *      na tela de confirmação, que consulta via `/api/pedidos/<id>/`.
 *
 * O token do Turnstile é validado uma única vez no backend (no create); NÃO é
 * reenviado no checkout.
 *
 * `apiFetch` extrai `pastoral_message` e lança `PastoralApiError`. Passamos
 * `showToast: false` porque o componente controla a exibição (banner + toast).
 */

export interface DoacaoAnonimaCriadaResponse {
  id: string;
  status?: string;
}

export async function criarDoacaoAnonima(
  payload: DoacaoData,
): Promise<DoacaoAnonimaCriadaResponse> {
  // `idade` e `valor_centavos` já chegam como number (schema); `cpf_cnpj` já
  // vem só com dígitos pelo `transform`; `telefone` já vem em E.164 do
  // componente. `pedido_oracao`/`instituicao` são omitidos quando ausentes.
  const cleaned: Record<string, unknown> = {
    nome: payload.nome,
    email: payload.email,
    cpf_cnpj: payload.cpf_cnpj,
    telefone: payload.telefone,
    sexo: payload.sexo,
    idade: payload.idade,
    valor_centavos: payload.valor_centavos,
    consent_aceito: payload.consent_aceito,
    turnstile_token: payload.turnstile_token,
    device_hash: payload.device_hash,
  };
  if (payload.pedido_oracao) {
    cleaned.pedido_oracao = payload.pedido_oracao;
  }
  if (payload.instituicao) {
    cleaned.instituicao = payload.instituicao;
  }

  return apiFetch<DoacaoAnonimaCriadaResponse>("/api/doacoes/", {
    method: "POST",
    body: JSON.stringify(cleaned),
    showToast: false,
  });
}

/**
 * Gera o Pix para um pedido já criado (POST `/api/pedidos/<id>/checkout/`).
 * Mesmo endpoint usado pelo fluxo pago logado — o QR é exibido pela tela de
 * confirmação. Não reenvia o token do Turnstile.
 */
export async function gerarCheckout(pedidoId: string): Promise<void> {
  await apiFetch<unknown>(`/api/pedidos/${pedidoId}/checkout/`, {
    method: "POST",
    showToast: false,
  });
}

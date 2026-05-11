import { apiFetch } from "@/lib/api";
import type { PedidoGratuitoData } from "@/lib/schemas/pedido-gratuito";

/**
 * Wrappers do fluxo freemium (Landing pública) — versão pós-renegociação 2026-05-08
 * + hardening wave 2 (P-V2 wave 2).
 *
 * Fluxo atual (double opt-in):
 *   1. `criarPedidoGratuito` — submete o pedido com CAPTCHA + device_hash
 *      opcional; backend cria Pedido em `AGUARDANDO_CONFIRMACAO_EMAIL` e
 *      envia e-mail com link `${FRONTEND_BASE_URL}/confirmar?token=X`.
 *   2. Usuário clica no link do e-mail → frontend abre
 *      `/confirmar` (página intermediária com botão).
 *   3. Usuário clica "Confirmar minha oração" → `confirmarPedidoGratuito`
 *      faz POST `/api/freemium/confirmar/` → backend executa a saga →
 *      navega pra `/confirmado?pedido_id=X`.
 *
 * P-V2 wave 2 desacoplou GET de POST — só o POST consome o token. Antes,
 * mail scanners corporativos faziam GET pre-fetch e queimavam o token
 * antes do usuário ver o e-mail.
 *
 * `apiFetch` cuida de extrair `pastoral_message` em erros e lança
 * `PastoralApiError`. Aqui passamos `showToast: false` porque os componentes
 * controlam exibição (toast vs banner inline).
 */

export interface CriarPedidoGratuitoResponse {
  pedido_id: string;
  status: string;
}

export async function criarPedidoGratuito(
  payload: PedidoGratuitoData,
): Promise<CriarPedidoGratuitoResponse> {
  // O backend espera `idade` como number (ou ausente) e `pedido_oracao`
  // ausente quando vazio. CPF chega já só com dígitos pelo `transform` do schema.
  const cleaned: Record<string, unknown> = {
    nome: payload.nome,
    email: payload.email,
    cpf_cnpj: payload.cpf_cnpj,
    telefone: payload.telefone,
    sexo: payload.sexo,
    consent_aceito: payload.consent_aceito,
    turnstile_token: payload.turnstile_token,
    device_hash: payload.device_hash,
  };
  if (payload.idade !== undefined && payload.idade !== "") {
    cleaned.idade = payload.idade;
  }
  if (payload.pedido_oracao) {
    cleaned.pedido_oracao = payload.pedido_oracao;
  }

  return apiFetch<CriarPedidoGratuitoResponse>("/api/freemium/pedidos/", {
    method: "POST",
    body: JSON.stringify(cleaned),
    showToast: false,
  });
}

export interface ConfirmarPedidoGratuitoResponse {
  pedido_id: string;
  status: string;
}

/**
 * Confirma um pedido gratuito por token (POST `/api/freemium/confirmar/`).
 *
 * P-V2 wave 2: chamado pela página `/confirmar` quando o
 * usuário clica em "Confirmar minha oração". Esta é a ÚNICA forma de
 * consumir o token — o GET correspondente apenas redireciona pra cá.
 */
export async function confirmarPedidoGratuito(
  token: string,
): Promise<ConfirmarPedidoGratuitoResponse> {
  return apiFetch<ConfirmarPedidoGratuitoResponse>(
    "/api/freemium/confirmar/",
    {
      method: "POST",
      body: JSON.stringify({ token }),
      showToast: false,
    },
  );
}

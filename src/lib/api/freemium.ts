import { apiFetch } from "@/lib/api";
import type { CorpoDoPedido } from "@/lib/api/doacoes";
import type { components } from "@/types/api-schema";

type S = components["schemas"];
export type PedidoFreemiumCriado = S["PedidoFreemiumCriado"];
/** `tokenDeSenha` é null quando a conta já tem senha (o record da API não marca @Nullable, o contrato não diz). */
export type PedidoConfirmado = Omit<S["PedidoConfirmado"], "tokenDeSenha"> & { tokenDeSenha?: string | null };

/**
 * Fluxo freemium (Landing pública), com confirmação por e-mail:
 *
 *   1. `criarPedidoGratuito`: `POST /api/freemium/pedidos` (CSRF + Turnstile). O pedido nasce em
 *      `AGUARDANDO_CONFIRMACAO_EMAIL` e a pessoa recebe o link `/confirmar?token=...`. Nenhuma conta
 *      nem e-mail de senha sai antes da confirmação.
 *   2. `/confirmar` mostra um botão; só o clique chama `confirmarPedidoGratuito`
 *      (`POST /api/freemium/confirmacao`), o que protege o token de pré-leitura por scanners de e-mail.
 *
 * Erros chegam como `PastoralApiError` (`code` em português: `conta_existente`, `pedido_em_andamento`,
 * `freemium_ja_usado`, `link_invalido`, `link_expirado`...). `showToast: false`: quem chama decide a exibição.
 */
export function criarPedidoGratuito(corpo: CorpoDoPedido, turnstileToken: string): Promise<PedidoFreemiumCriado> {
  return apiFetch<PedidoFreemiumCriado>("/api/freemium/pedidos", {
    method: "POST",
    body: JSON.stringify({ ...corpo, turnstileToken }),
    showToast: false,
  });
}

export function confirmarPedidoGratuito(token: string): Promise<PedidoConfirmado> {
  return apiFetch<PedidoConfirmado>("/api/freemium/confirmacao", {
    method: "POST",
    body: JSON.stringify({ token }),
    showToast: false,
  });
}

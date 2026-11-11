import type { components } from "./api-schema"

type S = components["schemas"]

/** Status do pedido como a API devolve (maiúsculas). */
export type StatusPedido = NonNullable<S["StatusPublico"]["status"]>
/** `GET /api/pedidos/{id}`: sem dado pessoal e sem Pix; a oração só vem em `ENVIADA`. */
export type StatusPublico = S["StatusPublico"]
/** `POST /api/pedidos/{id}/pix`: a cobrança vigente (o backend recria a vencida). */
export type PixDoPedido = S["PixDoPedido"]
/** `POST /api/pedidos`, `/api/pedidos/gratuito` e `/api/doacoes`. */
export type PedidoCriado = S["PedidoCriado"]

import type { components } from "@/types/api-schema"

type S = components["schemas"]

/** Lista e detalhe de `/api/admin/pedidos` (D22: o PATCH só corrige dados). */
export type AdminPedidoItem = S["PedidoAdminItem"]
export type AdminPedidoDetalhe = S["PedidoAdminDetalhe"]
/** `/api/admin/eventos-mp` (D21: só eventos do Mercado Pago). */
export type AdminEventoMp = S["EventoMpAdmin"]
export type AdminRepasse = S["RepasseAdmin"]

/** `PagedModel` do Spring (D23). */
export interface PagedModel<T> {
  content: T[]
  page: S["PageMetadata"]
}

// Derivados do contrato gerado; o springdoc marca tudo como opcional, mas a API devolve todos os campos.
export type AdminPlano = Required<components["schemas"]["PlanoAdmin"]>

export type AdminInstituicao = Omit<Required<components["schemas"]["InstituicaoAdmin"]>, "logoUrl"> & {
  logoUrl: string | null
}

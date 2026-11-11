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

/** Paginação antiga (limit/offset), ainda usada pelas telas do freemium (onda 5). */
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Derivados do contrato gerado; o springdoc marca tudo como opcional, mas a API devolve todos os campos.
export type AdminPlano = Required<components["schemas"]["PlanoAdmin"]>

export type AdminInstituicao = Omit<Required<components["schemas"]["InstituicaoAdmin"]>, "logoUrl"> & {
  logoUrl: string | null
}

// ---------------------------------------------------------------------------
// Etapa 7: Freemium (onda 5)
// ---------------------------------------------------------------------------

export interface AdminFreemiumBloqueio {
  id: string
  created_at: string
  cpf_hash_curto: string
  email_hash_curto: string
  tem_telefone: boolean
  tem_device: boolean
  tem_ip: boolean
}

export interface AdminFreemiumToken {
  id: string
  token_curto: string
  pedido_id: string
  created_at: string
  expires_at: string
  used_at: string | null
}

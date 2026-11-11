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

export interface AdminPromptTemplate {
  id: string
  nome: string
  versao: number
  system_prompt: string
  instrucoes_por_complexidade: {
    simples_gratuita?: string
    simples?: string
    com_versiculo?: string
    com_profecia_e_versiculos?: string
  }
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface PreviewResponse {
  oracao_preview: string
  template: {
    id: string
    nome: string
    versao: number
  }
}

export interface AdminDocumentoContexto {
  id: string
  nome: string
  descricao: string
  tipo_mime: string
  tamanho_bytes: number
  tamanho_formatado: string
  anthropic_file_id: string | null
  data_sincronizacao: string | null
  ativo: boolean
  esta_sincronizado: boolean
  created_at: string
  updated_at: string
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

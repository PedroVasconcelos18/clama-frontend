export interface AdminPedido {
  id: string
  nome: string
  email: string
  telefone: string | null
  idade: number | null
  sexo: string | null
  pedido_oracao: string
  plano: {
    id: string
    nome: string
    valor_reais_str: string
  }
  valor_centavos: number
  valor_reais_str: string
  eh_gratuito: boolean
  status: string
  canal_entrega: "email" | "whatsapp"
  oracao_gerada: string | null
  provider_payment_id: string | null
  provider_checkout_url: string | null
  retry_count: number
  last_error: string | null
  whatsapp_message_id: string | null
  whatsapp_delivered_at: string | null
  whatsapp_read_at: string | null
  created_at: string
  updated_at: string
  webhook_events?: Array<{
    id: string
    event_type: string
    status: string
    created_at: string
  }>
}

export interface AdminPedidoListItem {
  id: string
  nome: string
  email: string
  plano_nome: string
  valor_reais_str: string
  status: string
  canal_entrega: "email" | "whatsapp"
  created_at: string
  eh_gratuito?: boolean
}

export interface AdminCustomerListItem {
  id: number
  email: string
  nome_completo: string
  date_joined: string
  freemium_used_at: string | null
  is_clama_admin: boolean
  total_pedidos: number
  pedidos_pagos: number
  pedidos_gratuitos: number
  total_comentarios: number
  is_banned: boolean
  motivo_ban: string | null
  banido_em: string | null
}

export interface AdminCustomerBanimentoHistorico {
  id: string
  motivo: string
  banido_em: string
  banido_por_email: string
  revogado_em: string | null
  revogado_por_email: string | null
}

export interface AdminCustomerDetail {
  id: number
  email: string
  nome_completo: string
  date_joined: string
  last_login: string | null
  is_active: boolean
  is_clama_admin: boolean
  cpf_cnpj: string | null
  telefone: string | null
  nome_format_blog: "completo" | "compacto"
  freemium_used_at: string | null
  total_pedidos: number
  pedidos_pagos: number
  pedidos_gratuitos: number
  total_comentarios: number
  is_banned: boolean
  banimentos: AdminCustomerBanimentoHistorico[]
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface AdminPlano {
  id: string
  nome: string
  valor_centavos: number
  valor_reais_str: string
  descricao: string
  complexidade: "simples" | "com_versiculo" | "com_profecia_e_versiculos"
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface AdminInstituicao {
  id: string
  nome: string
  /** data-URI da logo (preview); "" quando não há logo. */
  logo: string
  ativo: boolean
  ordem: number
  created_at: string
  updated_at: string
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
// Etapa 7: Repasses, Webhooks e Freemium
// ---------------------------------------------------------------------------

export interface AdminRepasse {
  id: string
  pedido_id: string
  instituicao_id: string
  instituicao_nome: string
  valor_base_centavos: number
  percentual: number
  valor_centavos: number
  status: "registrado" | "transferido"
  transferido_em: string | null
  comprovante: string
  created_at: string
  updated_at: string
}

export type AdminWebhookStatus = "RECEBIDO" | "PROCESSADO" | "IGNORADO" | "ERRO"
export type AdminWebhookProvider = "MERCADO_PAGO" | "WORDPRESS" | "ASAAS" | "ZAPI"

export interface AdminWebhook {
  id: string
  created_at: string
  updated_at: string
  provider: AdminWebhookProvider
  event_type: string
  status: AdminWebhookStatus
  external_event_id: string
  pedido_id: string | null
  error_message: string
  /** Só no detalhe. */
  payload?: unknown
}

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

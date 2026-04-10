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
  status: string
  canal_entrega: "email" | "whatsapp"
  oracao_gerada: string | null
  asaas_charge_id: string | null
  asaas_invoice_url: string | null
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

export interface AdminPromptTemplate {
  id: string
  nome: string
  versao: number
  system_prompt: string
  instrucoes_por_complexidade: {
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

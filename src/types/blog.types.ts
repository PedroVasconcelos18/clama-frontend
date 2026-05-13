import { z } from "zod"

export const POST_STATUS = {
  RASCUNHO: "rascunho",
  PUBLICADO: "publicado",
} as const

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS]

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/
const urlRegex = /^https?:\/\/.+/

export const postFormSchema = z.object({
  titulo: z.string().min(3, "Título precisa ter ao menos 3 caracteres"),
  slug: z
    .string()
    .regex(
      slugRegex,
      "Slug deve usar apenas letras minúsculas, números e hífens",
    ),
  excerpt: z
    .string()
    .max(300, "Resumo limita-se a 300 caracteres")
    .optional()
    .or(z.literal("")),
  meta_title: z
    .string()
    .max(60, "Meta título: até 60 caracteres pra SEO ótimo")
    .optional()
    .or(z.literal("")),
  meta_description: z
    .string()
    .max(160, "Meta descrição: até 160 caracteres pra SEO ótimo")
    .optional()
    .or(z.literal("")),
  imagem_capa_url: z
    .string()
    .regex(urlRegex, "URL precisa começar com http:// ou https://")
    .optional()
    .or(z.literal("")),
  historia_ilustrativa: z.boolean(),
  conteudo_tiptap_json: z.unknown(),
  conteudo_html: z.string(),
})

export type PostFormValues = z.infer<typeof postFormSchema>

export type Post = {
  id: string
  titulo: string
  slug: string
  conteudo_html: string
  conteudo_tiptap_json: object
  excerpt: string
  meta_title: string
  meta_description: string
  imagem_capa_url: string
  status: PostStatus
  data_publicacao: string | null
  autor: { id?: string; nome: string; email?: string } | string
  historia_ilustrativa: boolean
  created_at: string
  updated_at: string
  /** Disponível em endpoints públicos (Story 3.1) */
  like_count?: number
  /** Disponível em endpoints públicos (Story 3.1) */
  comment_count?: number
}

export type PublicPost = Post & {
  like_count: number
  comment_count: number
}

/** Shape do PostPublicListSerializer (Story 3.1 backend) — endpoint /api/blog/public/posts/ list. */
export type PostPublicListItem = {
  slug: string
  titulo: string
  excerpt: string
  imagem_capa_url: string
  data_publicacao: string
  historia_ilustrativa: boolean
  autor_nome: string
  like_count: number
  comment_count: number
}

/** Shape do PostPublicSerializer (Story 3.1 backend) — endpoint /api/blog/public/posts/<slug>/ detail. */
export type PostPublicDetail = PostPublicListItem & {
  conteudo_html: string
  meta_title: string
  meta_description: string
  updated_at: string
}

export type PaginatedPublicPosts = {
  count: number
  next: string | null
  previous: string | null
  results: PostPublicListItem[]
}

/** Shape do ComentarioSerializer (Story 4.3 backend). */
export type Comentario = {
  id: string
  post: string
  customer: string
  customer_nome: string
  conteudo: string
  created_at: string
  updated_at: string
}

export type PaginatedComentarios = {
  count: number
  next: string | null
  previous: string | null
  results: Comentario[]
}

/** Resposta do POST /api/blog/posts/<slug>/like/ (Story 4.4 backend). */
export type LikeToggleResponse = {
  liked: boolean
  like_count: number
}

/** Shape do AdminComentarioSerializer (Story 5.2 backend). */
export type AdminComentario = {
  id: string
  post_slug: string
  post_titulo: string
  customer_email: string
  customer_id?: string
  customer_nome: string
  conteudo: string
  is_suspeito: boolean
  ip_address: string
  created_at: string
}

export type PaginatedAdminComentarios = {
  count: number
  next: string | null
  previous: string | null
  results: AdminComentario[]
}

/** Shape do CustomerBanidoListSerializer (Story 5.2 backend). */
export type AdminCustomerBanido = {
  id: string
  customer_id: string
  customer_email: string
  customer_nome: string
  motivo: string
  banido_em: string
  banido_por_email: string
}

export type PaginatedAdminBanidos = {
  count: number
  next: string | null
  previous: string | null
  results: AdminCustomerBanido[]
}

export type PaginatedPosts = {
  count: number
  next: string | null
  previous: string | null
  results: Post[]
}

export type PostListItem = Pick<
  Post,
  | "id"
  | "titulo"
  | "slug"
  | "status"
  | "data_publicacao"
  | "historia_ilustrativa"
  | "created_at"
  | "updated_at"
> & {
  autor: string | { id?: string; nome: string }
}

export function gerarSlugDeTitulo(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

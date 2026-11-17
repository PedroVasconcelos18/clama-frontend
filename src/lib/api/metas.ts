import { apiFetch } from "@/lib/api"

// TODO(T11): trocar pelo tipo gerado do OpenAPI
export type Metas = {
  percentual: number
  de: string // AAAA-MM-DD
  ate: string // AAAA-MM-DD
  instituicoes: { instituicaoId: number; arrecadadoCentavos: number }[]
}

export function buscarMetas(): Promise<Metas> {
  return apiFetch<Metas>("/api/metas", { showToast: false })
}

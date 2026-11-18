import { apiFetch } from "@/lib/api"
import type { components } from "@/types/api-schema"

type S = components["schemas"]

// O springdoc marca tudo como opcional, mas a API devolve todos os campos. `de` e `ate`: AAAA-MM-DD.
export type Metas = Required<Omit<S["Metas"], "instituicoes">> & { instituicoes: Required<S["Arrecadado"]>[] }

export function buscarMetas(): Promise<Metas> {
  return apiFetch<Metas>("/api/metas", { showToast: false })
}

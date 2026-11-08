import type { components } from "@/types/api-schema"

type Item = Required<components["schemas"]["UsuarioAdminItem"]>

/** Linha da lista e detalhe de `/api/admin/usuarios` (o servidor omite `ultimoLoginEm` quem nunca entrou). */
export type UsuarioAdmin = Omit<Item, "ultimoLoginEm"> & { ultimoLoginEm?: string | null }

export type PaginaDeUsuarios = Omit<components["schemas"]["PagedModelUsuarioAdminItem"], "content"> & {
  content: UsuarioAdmin[]
}

export const ROTULO_PAPEL: Record<UsuarioAdmin["papel"], string> = {
  CLIENTE: "Cliente",
  ADMIN: "Admin",
  SUPERUSUARIO: "Superusuário",
}

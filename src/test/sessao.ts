import { vi } from "vitest"
import * as apiModule from "@/lib/api"
import { PastoralApiError } from "@/lib/api"

export const usuarioFixture = {
  id: 1,
  email: "fiel@example.com",
  nomeCompleto: "Pedro",
  nomeFormatoBlog: "Pedro",
  papel: "CLIENTE" as const,
}

/**
 * Espiona `apiFetch` respondendo o boot da sessão (`GET /api/auth/eu`):
 * `usuario` presente = logado, ausente = 401 (anônimo). As demais rotas
 * caem em `outras`.
 */
export function mockApiFetch(
  opts: {
    usuario?: object | null
    outras?: (path: string, init?: RequestInit) => unknown
  } = {},
) {
  return vi
    .spyOn(apiModule, "apiFetch")
    .mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/auth/eu") {
        if (opts.usuario) return opts.usuario as never
        throw new PastoralApiError("Erro", "unknown", "", 401)
      }
      if (!opts.outras) throw new Error(`apiFetch sem mock para ${path}`)
      return (await opts.outras(path, init)) as never
    })
}

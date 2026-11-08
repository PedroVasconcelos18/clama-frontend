import { useEffect, useState } from "react"
import { useApi } from "@/hooks/useApi"
import type { PaginatedResponse } from "@/types/admin.types"

export const PAGE_SIZE = 20

/** GET paginado (limit/offset) de uma lista admin; refaz quando filtros, offset ou reloadToken mudam. */
export function useAdminList<T>(
  path: string,
  filters: Record<string, string>,
  offset: number,
  reloadToken = 0,
) {
  const { fetchApi } = useApi()
  // resultado guardado com a chave da requisição: loading = ainda não chegou o da chave atual
  const [result, setResult] = useState<{
    key: string
    data: PaginatedResponse<T> | null
    error: string | null
  } | null>(null)
  const filtersKey = JSON.stringify(filters)
  const key = `${path}|${filtersKey}|${offset}|${reloadToken}`

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    })
    for (const [k, v] of Object.entries(JSON.parse(filtersKey) as Record<string, string>))
      if (v.trim()) params.set(k, v.trim())
    fetchApi<PaginatedResponse<T>>(`${path}?${params.toString()}`)
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch((err: { pastoralMessage?: string }) => {
        if (!cancelled)
          setResult({
            key,
            data: null,
            error: err?.pastoralMessage ?? "Não foi possível carregar a lista.",
          })
      })
    return () => {
      cancelled = true
    }
  }, [fetchApi, path, filtersKey, offset, reloadToken, key])

  const atual = result?.key === key ? result : null
  return {
    // mantém a página anterior na tela enquanto a nova carrega
    data: (atual ?? result)?.data ?? null,
    loading: !atual,
    error: atual?.error ?? null,
  }
}

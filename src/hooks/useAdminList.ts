import { useEffect, useState } from "react"
import { useApi } from "@/hooks/useApi"
import type { PagedModel } from "@/types/admin.types"

export const PAGE_SIZE = 20

/** GET de lista; refaz quando a URL ou o reloadToken mudam e mantém a página anterior enquanto a nova carrega. */
function useLista<R>(url: string, reloadToken: number) {
  const { fetchApi } = useApi()
  // resultado guardado com a chave da requisição: loading = ainda não chegou o da chave atual
  const [result, setResult] = useState<{ key: string; data: R | null; error: string | null } | null>(null)
  const key = `${url}|${reloadToken}`

  useEffect(() => {
    let cancelled = false
    fetchApi<R>(url)
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch((err: { pastoralMessage?: string }) => {
        if (!cancelled)
          setResult({ key, data: null, error: err?.pastoralMessage ?? "Não foi possível carregar a lista." })
      })
    return () => {
      cancelled = true
    }
  }, [fetchApi, url, key])

  const atual = result?.key === key ? result : null
  return {
    data: (atual ?? result)?.data ?? null,
    loading: !atual,
    error: atual?.error ?? null,
  }
}

function comFiltros(path: string, base: Record<string, string>, filters: Record<string, string>) {
  const params = new URLSearchParams(base)
  for (const [k, v] of Object.entries(filters)) if (v.trim()) params.set(k, v.trim())
  return `${path}?${params.toString()}`
}

/** Lista admin em `PagedModel` (page/size). `offset` em itens, como o `AdminPager`. */
export function usePaginaAdmin<T>(path: string, filters: Record<string, string>, offset: number, reloadToken = 0) {
  return useLista<PagedModel<T>>(
    comFiltros(path, { page: String(Math.floor(offset / PAGE_SIZE)), size: String(PAGE_SIZE) }, filters),
    reloadToken,
  )
}

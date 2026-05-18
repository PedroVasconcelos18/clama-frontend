import type { PaginatedPublicPosts } from "@/types/blog.types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

/**
 * Vike chama esta função no início do build pra descobrir quais URLs dinâmicas
 * de /blog/<slug> precisam ser prerenderizadas. Sem backend disponível, retorna
 * lista vazia (Vike não prerendera nada; URLs ficam sem fallback SSG mas
 * Vercel pode SSR no runtime se Story 6.3 for habilitada).
 */
export async function onBeforePrerenderStart(): Promise<string[]> {
  const urls: string[] = []
  let next: string | null =
    `${API_URL}/api/blog/public/posts/?page_size=100`

  try {
    while (next) {
      const response = await fetch(next, {
        headers: { Accept: "application/json" },
      })
      if (!response.ok) break
      const payload = (await response.json()) as PaginatedPublicPosts
      for (const post of payload.results) {
        urls.push(`/blog/${post.slug}`)
      }
      next = payload.next
    }
  } catch {
    // sem backend disponível durante o build — segue com a lista que tiver
  }

  return urls
}

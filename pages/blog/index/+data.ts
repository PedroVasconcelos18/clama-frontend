import type {
  PaginatedPublicPosts,
  PostPublicListItem,
} from "@/types/blog.types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"
const PAGE_SIZE = 12

export type BlogIndexData = {
  posts: PostPublicListItem[]
  count: number
  page: number
  hasNext: boolean
  hasPrevious: boolean
  apiAvailable: boolean
}

/**
 * Vike data fetcher (server-side). Roda em build time (prerender) e em SSR dev.
 * Se o backend não responde durante o build (ex: pipeline sem rede), retorna
 * `apiAvailable=false` — página renderiza empty state graciosamente em vez de
 * abortar o build inteiro.
 */
export async function data({
  urlParsed,
}: {
  urlParsed: { search: Record<string, string | undefined> }
}): Promise<BlogIndexData> {
  const pageParam = urlParsed.search.page
  const parsed = pageParam ? Number(pageParam) : 1
  const page =
    Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1

  try {
    const response = await fetch(
      `${API_URL}/api/blog/public/posts/?page=${page}&page_size=${PAGE_SIZE}`,
      { headers: { Accept: "application/json" } },
    )
    if (!response.ok) {
      return {
        posts: [],
        count: 0,
        page,
        hasNext: false,
        hasPrevious: false,
        apiAvailable: false,
      }
    }
    const payload = (await response.json()) as PaginatedPublicPosts
    return {
      posts: payload.results,
      count: payload.count,
      page,
      hasNext: Boolean(payload.next),
      hasPrevious: Boolean(payload.previous),
      apiAvailable: true,
    }
  } catch {
    return {
      posts: [],
      count: 0,
      page,
      hasNext: false,
      hasPrevious: false,
      apiAvailable: false,
    }
  }
}

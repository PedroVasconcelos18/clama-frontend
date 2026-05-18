import type { PostPublicDetail } from "@/types/blog.types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export type BlogPostData = {
  post: PostPublicDetail | null
  apiAvailable: boolean
}

export async function data({
  routeParams,
}: {
  routeParams: { slug: string }
}): Promise<BlogPostData> {
  const { slug } = routeParams
  try {
    const response = await fetch(
      `${API_URL}/api/blog/public/posts/${encodeURIComponent(slug)}/`,
      { headers: { Accept: "application/json" } },
    )
    if (response.status === 404) {
      return { post: null, apiAvailable: true }
    }
    if (!response.ok) {
      return { post: null, apiAvailable: false }
    }
    const payload = (await response.json()) as PostPublicDetail
    return { post: payload, apiAvailable: true }
  } catch {
    return { post: null, apiAvailable: false }
  }
}

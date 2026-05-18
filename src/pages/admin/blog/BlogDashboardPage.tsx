import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { useAdminApi } from "@/hooks/useAdminApi"
import type { PaginatedPosts } from "@/types/blog.types"

type Stats = {
  total: number
  publicados: number
  rascunhos: number
}

function StatsCard({
  label,
  value,
  loading,
}: {
  label: string
  value: number | null
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-clama-gold/20 bg-clama-night p-5">
      <p className="text-sm uppercase tracking-wide text-clama-cream/60">
        {label}
      </p>
      <p className="mt-2 font-serif text-4xl text-clama-gold">
        {loading ? "…" : (value ?? "—")}
      </p>
    </div>
  )
}

async function fetchCount(
  adminFetch: ReturnType<typeof useAdminApi>["adminFetch"],
  query: string,
): Promise<number> {
  const response = await adminFetch<PaginatedPosts>(
    `/api/blog/posts/?${query}&page_size=1`,
  )
  return response.count
}

export default function BlogDashboardPage() {
  const { adminFetch } = useAdminApi()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchCount(adminFetch, ""),
      fetchCount(adminFetch, "status=publicado"),
      fetchCount(adminFetch, "status=rascunho"),
    ])
      .then(([total, publicados, rascunhos]) => {
        if (!cancelled) setStats({ total, publicados, rascunhos })
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adminFetch])

  const isEmpty = !loading && stats?.total === 0

  return (
    <div className="space-y-6 bg-clama-night-deep p-6 text-clama-cream">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl text-clama-gold">Blog</h1>
          <p className="text-sm text-clama-cream/60">
            Visão geral dos posts do blog do Clama.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/blog/posts"
            className={buttonVariants({ variant: "outline" })}
          >
            Ver todos os posts
          </Link>
          <Link
            to="/admin/blog/posts/novo"
            className={buttonVariants({ variant: "gold" })}
          >
            Novo post
          </Link>
        </div>
      </header>

      {isEmpty ? (
        <div className="rounded-lg border border-clama-gold/20 bg-clama-night p-8 text-center">
          <p className="font-serif text-xl text-clama-cream">
            Nenhum post por aqui ainda.
          </p>
          <p className="mt-2 text-sm text-clama-cream/70">
            Comece criando seu primeiro post pra Juliana ler.
          </p>
          <Link
            to="/admin/blog/posts/novo"
            className={`${buttonVariants({ variant: "gold" })} mt-4 inline-flex`}
          >
            Criar primeiro post
          </Link>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          <StatsCard
            label="Total de posts"
            value={stats?.total ?? null}
            loading={loading}
          />
          <StatsCard
            label="Publicados"
            value={stats?.publicados ?? null}
            loading={loading}
          />
          <StatsCard
            label="Rascunhos"
            value={stats?.rascunhos ?? null}
            loading={loading}
          />
        </section>
      )}
    </div>
  )
}

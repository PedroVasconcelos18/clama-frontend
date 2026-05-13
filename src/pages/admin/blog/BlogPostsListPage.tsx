import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAdminApi } from "@/hooks/useAdminApi"
import { cn } from "@/lib/utils"
import type {
  PaginatedPosts,
  PostListItem,
  PostStatus,
} from "@/types/blog.types"

type StatusFilter = "todos" | "rascunho" | "publicado"
type Ordering = "-data_publicacao" | "data_publicacao"

const PAGE_SIZE = 20

function statusLabel(status: PostStatus): string {
  return status === "publicado" ? "Publicado" : "Rascunho"
}

function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        status === "publicado"
          ? "bg-clama-blog-gold-soft/30 text-clama-blog-purple-prose"
          : "bg-clama-cream-warm text-clama-night",
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

function formatData(iso?: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function autorNome(autor: PostListItem["autor"]): string {
  if (typeof autor === "string") return autor
  return autor?.nome ?? "—"
}

export default function BlogPostsListPage() {
  const { adminFetch } = useAdminApi()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [ordering, setOrdering] = useState<Ordering>("-data_publicacao")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaginatedPosts | null>(null)
  const [loading, setLoading] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<PostListItem | null>(null)
  const [unpublishTarget, setUnpublishTarget] = useState<PostListItem | null>(
    null,
  )
  const [confirmTitle, setConfirmTitle] = useState("")
  const [actionInFlight, setActionInFlight] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("ordering", ordering)
    if (statusFilter !== "todos") params.set("status", statusFilter)

    adminFetch<PaginatedPosts>(`/api/blog/posts/?${params.toString()}`)
      .then((response) => {
        if (!cancelled) setData(response)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [adminFetch, statusFilter, ordering, page, reloadToken])

  function reload() {
    setReloadToken((n) => n + 1)
  }

  function handleSelectFilter(next: StatusFilter) {
    setStatusFilter(next)
    setPage(1)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setActionInFlight(true)
    try {
      await adminFetch(`/api/blog/posts/${deleteTarget.id}/`, {
        method: "DELETE",
      })
      toast.success("Post excluído.")
      setDeleteTarget(null)
      setConfirmTitle("")
      reload()
    } finally {
      setActionInFlight(false)
    }
  }

  async function handleConfirmUnpublish() {
    if (!unpublishTarget) return
    setActionInFlight(true)
    try {
      await adminFetch(`/api/blog/posts/${unpublishTarget.id}/despublicar/`, {
        method: "POST",
      })
      toast.success("Post despublicado.")
      setUnpublishTarget(null)
      reload()
    } finally {
      setActionInFlight(false)
    }
  }

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0
  const posts = data?.results ?? []

  return (
    <div className="space-y-4 bg-clama-night-deep p-6 text-clama-cream">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl text-clama-gold">Posts</h1>
        <Link
          to="/admin/blog/posts/novo"
          className={buttonVariants({ variant: "gold" })}
        >
          Novo post
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="tablist" aria-label="Filtro de status">
          {(["todos", "rascunho", "publicado"] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "gold" : "outline"}
              size="sm"
              role="tab"
              aria-selected={statusFilter === filter}
              onClick={() => handleSelectFilter(filter)}
            >
              {filter === "todos"
                ? "Todos"
                : filter === "rascunho"
                  ? "Rascunhos"
                  : "Publicados"}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setOrdering((o) =>
              o === "-data_publicacao" ? "data_publicacao" : "-data_publicacao",
            )
          }
        >
          Data:{" "}
          {ordering === "-data_publicacao" ? "mais recentes" : "mais antigos"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-clama-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-clama-night text-clama-cream/70">
            <tr>
              <th className="p-3">Título</th>
              <th className="p-3">Status</th>
              <th className="p-3">Autor</th>
              <th className="p-3">Data</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-3 text-clama-cream/60" colSpan={5}>
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && posts.length === 0 && (
              <tr>
                <td className="p-6 text-center text-clama-cream/60" colSpan={5}>
                  Ainda não há posts. Clique em "Novo post" pra começar.
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id} className="border-t border-clama-gold/10">
                <td className="p-3 font-medium">{post.titulo}</td>
                <td className="p-3">
                  <StatusBadge status={post.status} />
                </td>
                <td className="p-3 text-clama-cream/70">
                  {autorNome(post.autor)}
                </td>
                <td className="p-3 text-clama-cream/70">
                  {formatData(post.data_publicacao ?? post.updated_at)}
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    <Link
                      to={`/admin/blog/posts/${post.id}/editar`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Editar
                    </Link>
                    {post.status === "publicado" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUnpublishTarget(post)}
                      >
                        Despublicar
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeleteTarget(post)
                        setConfirmTitle("")
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-clama-cream/60">
            Página {page} de {totalPages} — {data?.count ?? 0} posts
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir post permanentemente</DialogTitle>
            <DialogDescription>
              Essa ação não pode ser desfeita. Para confirmar, digite o título
              exato do post abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-title">
              Título: <strong>{deleteTarget?.titulo}</strong>
            </Label>
            <Input
              id="confirm-title"
              value={confirmTitle}
              onChange={(e) => setConfirmTitle(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={
                actionInFlight || confirmTitle.trim() !== deleteTarget?.titulo
              }
              onClick={handleConfirmDelete}
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={unpublishTarget !== null}
        onOpenChange={(o) => !o && setUnpublishTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Despublicar post</DialogTitle>
            <DialogDescription>
              O post sai do ar mas o conteúdo é preservado. Você pode publicar
              novamente depois.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnpublishTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              disabled={actionInFlight}
              onClick={handleConfirmUnpublish}
            >
              Despublicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

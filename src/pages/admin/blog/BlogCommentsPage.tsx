import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAdminApi } from "@/hooks/useAdminApi"
import { tempoRelativo } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import type {
  AdminComentario,
  PaginatedAdminComentarios,
} from "@/types/blog.types"

type StatusFilter = "todos" | "suspeitos"

const PAGE_SIZE = 20

export default function BlogCommentsPage() {
  const { adminFetch } = useAdminApi()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [postSlugFilter, setPostSlugFilter] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaginatedAdminComentarios | null>(null)
  const [loading, setLoading] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<AdminComentario | null>(null)
  const [banTarget, setBanTarget] = useState<AdminComentario | null>(null)
  const [banMotivo, setBanMotivo] = useState("")
  const [actionInFlight, setActionInFlight] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    if (statusFilter === "suspeitos") params.set("status", "suspeitos")
    if (postSlugFilter.trim()) params.set("post__slug", postSlugFilter.trim())
    params.set("page_size", String(PAGE_SIZE))

    adminFetch<PaginatedAdminComentarios>(
      `/api/blog/admin/comments/?${params.toString()}`,
    )
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
  }, [adminFetch, statusFilter, postSlugFilter, page, reloadToken])

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
      await adminFetch(`/api/blog/admin/comments/${deleteTarget.id}/`, {
        method: "DELETE",
      })
      toast.success("Comentário excluído.")
      setDeleteTarget(null)
      reload()
    } finally {
      setActionInFlight(false)
    }
  }

  async function handleConfirmBan() {
    if (!banTarget || !banTarget.customer_id) return
    setActionInFlight(true)
    try {
      await adminFetch(`/api/blog/admin/banned-customers/`, {
        method: "POST",
        body: JSON.stringify({
          customer_id: banTarget.customer_id,
          motivo: banMotivo.trim() || "Sem motivo informado",
        }),
      })
      toast.success("Customer banido do sistema de comentários.")
      setBanTarget(null)
      setBanMotivo("")
      reload()
    } finally {
      setActionInFlight(false)
    }
  }

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0
  const comments = data?.results ?? []

  return (
    <div className="space-y-4 bg-clama-night-deep p-6 text-clama-cream">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl text-clama-gold">Comentários</h1>
        <span className="text-sm text-clama-cream/60">
          {data?.count ?? 0} total
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex gap-1"
          role="tablist"
          aria-label="Filtro de status"
        >
          {(["todos", "suspeitos"] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "gold" : "outline"}
              size="sm"
              role="tab"
              aria-selected={statusFilter === filter}
              onClick={() => handleSelectFilter(filter)}
            >
              {filter === "todos" ? "Todos" : "Suspeitos"}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Filtrar por slug do post"
          value={postSlugFilter}
          onChange={(e) => {
            setPostSlugFilter(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-clama-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-clama-night text-clama-cream/70">
            <tr>
              <th className="p-3">Comentário</th>
              <th className="p-3">Post</th>
              <th className="p-3">Customer</th>
              <th className="p-3">IP</th>
              <th className="p-3">Data</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-3 text-clama-cream/60" colSpan={6}>
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && comments.length === 0 && (
              <tr>
                <td className="p-6 text-center text-clama-cream/60" colSpan={6}>
                  Nenhum comentário com esse filtro.
                </td>
              </tr>
            )}
            {comments.map((c) => (
              <tr
                key={c.id}
                className={cn(
                  "border-t border-clama-gold/10",
                  c.is_suspeito && "bg-destructive/5",
                )}
              >
                <td className="max-w-[28ch] p-3">
                  <div className="line-clamp-3 text-clama-cream">
                    {c.conteudo}
                  </div>
                  {c.is_suspeito && (
                    <span className="mt-1 inline-block rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">
                      Suspeito
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <a
                    href={`/blog/${c.post_slug}`}
                    className="text-clama-gold hover:underline"
                  >
                    {c.post_titulo || c.post_slug}
                  </a>
                </td>
                <td className="p-3 text-clama-cream/70">
                  <div>{c.customer_nome}</div>
                  <div className="text-xs text-clama-cream/50">
                    {c.customer_email}
                  </div>
                </td>
                <td className="p-3 text-xs text-clama-cream/50">
                  {c.ip_address || "—"}
                </td>
                <td className="p-3 text-clama-cream/70">
                  {tempoRelativo(c.created_at)}
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    {c.customer_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBanTarget(c)
                          setBanMotivo("")
                        }}
                      >
                        Banir
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(c)}
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
            Página {page} de {totalPages}
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
            <DialogTitle>Excluir comentário</DialogTitle>
            <DialogDescription>
              O comentário some do post imediatamente. Não há undo.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="line-clamp-4 rounded-md border border-clama-gold/20 bg-clama-night-soft p-3 text-sm text-clama-night">
              {deleteTarget.conteudo}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={actionInFlight}
              onClick={handleConfirmDelete}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={banTarget !== null}
        onOpenChange={(o) => !o && setBanTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banir customer dos comentários</DialogTitle>
            <DialogDescription>
              {banTarget?.customer_nome} ({banTarget?.customer_email}) não vai
              poder mais comentar nem dar like, mas continua podendo ler.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ban-motivo">Motivo (registro interno)</Label>
            <Textarea
              id="ban-motivo"
              value={banMotivo}
              onChange={(e) => setBanMotivo(e.target.value)}
              rows={3}
              placeholder="Ofensa, spam, etc."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={actionInFlight}
              onClick={handleConfirmBan}
            >
              Banir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { AdminPager } from "@/components/admin/AdminPager"
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
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { useApi } from "@/hooks/useApi"
import { usePaginaAdmin } from "@/hooks/useAdminList"
import { tempoRelativo } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import type { components } from "@/types/api-schema"

type Comentario = components["schemas"]["ParaAdmin"]

/** O servidor recusa motivo com menos de 3 caracteres. */
export const MOTIVO_MINIMO = 3

/** Comentários do blog (`/api/admin/blog/comentarios`). Nunca mostra IP: a API nem o devolve. */
export default function BlogCommentsPage() {
  const { fetchApi } = useApi()
  const [searchParams] = useSearchParams()
  const [suspeitos, setSuspeitos] = useState(false)
  const [post, setPost] = useState("")
  const [usuarioId, setUsuarioId] = useState(searchParams.get("usuarioId") ?? "")
  const [offset, setOffset] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [apagar, setApagar] = useState<Comentario | null>(null)
  const [banir, setBanir] = useState<Comentario | null>(null)
  const [motivo, setMotivo] = useState("")
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = usePaginaAdmin<Comentario>(
    "/api/admin/blog/comentarios",
    { suspeitos: suspeitos ? "true" : "", post, usuarioId },
    offset,
    reloadToken,
  )
  const total = data?.page.totalElements ?? 0
  const comentarios = data?.content ?? []

  const filtrar = (fn: () => void) => {
    fn()
    setOffset(0)
  }

  async function confirmarApagar() {
    if (!apagar) return
    setBusy(true)
    try {
      await fetchApi(`/api/admin/blog/comentarios/${apagar.id}`, { method: "DELETE" })
      toast.success("Comentário excluído.")
      setApagar(null)
      setReloadToken((n) => n + 1)
    } catch {
      /* fetchApi já avisou com o toast */
    } finally {
      setBusy(false)
    }
  }

  async function confirmarBanir() {
    if (!banir) return
    setBusy(true)
    try {
      await fetchApi("/api/admin/blog/banimentos", {
        method: "POST",
        body: JSON.stringify({ usuarioId: banir.usuarioId, motivo: motivo.trim() }),
      })
      toast.success("Autor banido do sistema de comentários.")
      setBanir(null)
      setMotivo("")
      setReloadToken((n) => n + 1)
    } catch {
      /* fetchApi já avisou com o toast */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 bg-clama-night-deep p-6 text-clama-cream">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl text-clama-gold">Comentários</h1>
        <span className="text-sm text-clama-cream/60">{total} total</span>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="tablist" aria-label="Filtro de status">
          {([false, true] as const).map((s) => (
            <Button
              key={String(s)}
              variant={suspeitos === s ? "gold" : "outline"}
              size="sm"
              role="tab"
              aria-selected={suspeitos === s}
              onClick={() => filtrar(() => setSuspeitos(s))}
            >
              {s ? "Suspeitos" : "Todos"}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Filtrar por slug do post"
          value={post}
          onChange={(e) => filtrar(() => setPost(e.target.value))}
          className="max-w-xs"
        />
        <Input
          placeholder="ID do usuário"
          inputMode="numeric"
          value={usuarioId}
          onChange={(e) => filtrar(() => setUsuarioId(e.target.value.replace(/\D/g, "")))}
          className="max-w-[10rem]"
        />
      </div>

      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}

      <div className="overflow-x-auto rounded-md border border-clama-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-clama-night text-clama-cream/70">
            <tr>
              <th className="p-3">Comentário</th>
              <th className="p-3">Post</th>
              <th className="p-3">Autor</th>
              <th className="p-3">Data</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-3" colSpan={5}>
                  <LoadingSpinner size={20} />
                </td>
              </tr>
            )}
            {!loading && comentarios.length === 0 && (
              <tr>
                <td className="p-6 text-center text-clama-cream/60" colSpan={5}>
                  Nenhum comentário com esse filtro.
                </td>
              </tr>
            )}
            {comentarios.map((c) => (
              <tr key={c.id} className={cn("border-t border-clama-gold/10", c.suspeito && "bg-destructive/5")}>
                <td className="max-w-[28ch] p-3">
                  <div className="line-clamp-3 text-clama-cream">{c.conteudo}</div>
                  {c.suspeito && (
                    <span className="mt-1 inline-block rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">
                      Suspeito
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {c.postUrl ? (
                    <a href={c.postUrl} className="text-clama-gold hover:underline">
                      {c.postTitulo || c.postSlug}
                    </a>
                  ) : (
                    c.postTitulo || c.postSlug || "—"
                  )}
                </td>
                <td className="p-3 text-clama-cream/70">
                  <div>{c.usuarioNome}</div>
                  <div className="text-xs text-clama-cream/50">{c.usuarioEmail}</div>
                </td>
                <td className="p-3 text-clama-cream/70">{c.criadoEm ? tempoRelativo(c.criadoEm) : "—"}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    {c.usuarioId != null && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBanir(c)
                          setMotivo("")
                        }}
                      >
                        Banir
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => setApagar(c)}>
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPager offset={offset} total={total} onChange={setOffset} />

      <Dialog open={apagar !== null} onOpenChange={(o) => !o && !busy && setApagar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir comentário</DialogTitle>
            <DialogDescription>O comentário some do post imediatamente. Não há undo.</DialogDescription>
          </DialogHeader>
          {apagar && (
            <p className="line-clamp-4 rounded-md border border-clama-gold/20 bg-clama-night-soft p-3 text-sm text-clama-night">
              {apagar.conteudo}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApagar(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={busy} onClick={confirmarApagar}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banir !== null} onOpenChange={(o) => !o && !busy && setBanir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banir autor dos comentários</DialogTitle>
            <DialogDescription>
              {banir?.usuarioNome} ({banir?.usuarioEmail}) não vai poder mais comentar nem curtir, mas continua podendo
              ler.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ban-motivo">Motivo (registro interno, obrigatório)</Label>
            <Textarea
              id="ban-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ofensa, spam, etc."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanir(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busy || motivo.trim().length < MOTIVO_MINIMO}
              onClick={confirmarBanir}
            >
              Banir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

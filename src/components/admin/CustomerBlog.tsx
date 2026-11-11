import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { formatarDataHora } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOTIVO_MINIMO } from "@/pages/admin/blog/BlogCommentsPage";
import type { PagedModel } from "@/types/admin.types";
import type { components } from "@/types/api-schema";

type Banimento = components["schemas"]["Item"];
type Comentario = components["schemas"]["ParaAdmin"];

/**
 * Seção "Blog" da ficha: nº de comentários, ban ativo, banir e revogar.
 * Sem rota própria (D11): `totalElements` de `comentarios?usuarioId=&size=1` e `banimentos?usuarioId=`.
 */
export function CustomerBlog({
  usuarioId,
  papel,
}: {
  usuarioId: number;
  papel?: string;
}) {
  const { fetchApi } = useApi();
  const [comentarios, setComentarios] = useState<number | null>(null);
  const [ban, setBan] = useState<Banimento | null | undefined | "erro">(
    undefined,
  ); // undefined = carregando
  const [refresh, setRefresh] = useState(0);
  const [dialogo, setDialogo] = useState<"banir" | "revogar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchApi<PagedModel<Comentario>>(
      `/api/admin/blog/comentarios?usuarioId=${usuarioId}&size=1`,
      { showToast: false },
    )
      .then((r) => !cancelled && setComentarios(r.page.totalElements ?? 0))
      .catch(() => !cancelled && setComentarios(null));
    fetchApi<PagedModel<Banimento>>(
      `/api/admin/blog/banimentos?usuarioId=${usuarioId}`,
      { showToast: false },
    )
      .then((r) => !cancelled && setBan(r.content[0] ?? null))
      .catch(() => !cancelled && setBan("erro"));
    return () => {
      cancelled = true;
    };
  }, [fetchApi, usuarioId, refresh]);

  async function escrever(fn: () => Promise<unknown>, sucesso: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(sucesso);
      setDialogo(null);
      setMotivo("");
      setRefresh((n) => n + 1);
    } catch {
      /* fetchApi já avisou com o toast */
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h3 className="font-sans text-xs font-bold tracking-[2px] uppercase text-clama-gold mb-2">
        Blog
      </h3>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-[160px_1fr] gap-2">
          <span className="text-clama-cream/60">Comentários</span>
          <span className="text-clama-cream">
            {comentarios === null ? "—" : comentarios}
            {!!comentarios && (
              <Link
                to={`/admin/blog/comentarios?usuarioId=${usuarioId}`}
                className="ml-2 text-clama-gold hover:underline"
              >
                ver comentários
              </Link>
            )}
          </span>
        </div>
        <div className="grid grid-cols-[160px_1fr] gap-2">
          <span className="text-clama-cream/60">Banimento</span>
          <span className="text-clama-cream break-words">
            {ban === undefined
              ? "—"
              : ban === "erro"
                ? "indisponível"
                : ban
                  ? `Banido em ${formatarDataHora(ban.banidoEm)}: ${ban.motivo}`
                  : "Sem banimento"}
          </span>
        </div>
        {ban !== undefined &&
          ban !== "erro" &&
          (ban || papel === undefined || papel === "CLIENTE") && (
            <Button
              variant={ban ? "outline" : "destructive"}
              size="sm"
              onClick={() => setDialogo(ban ? "revogar" : "banir")}
            >
              {ban ? "Revogar banimento" : "Banir do blog"}
            </Button>
          )}
      </div>

      <Dialog
        open={dialogo === "banir"}
        onOpenChange={(o) => !o && !busy && setDialogo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banir do blog?</DialogTitle>
            <DialogDescription>
              A pessoa não poderá comentar nem curtir, mas continua podendo ler.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ficha-ban-motivo">
              Motivo (registro interno, obrigatório)
            </Label>
            <Textarea
              id="ficha-ban-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busy || motivo.trim().length < MOTIVO_MINIMO}
              onClick={() =>
                escrever(
                  () =>
                    fetchApi("/api/admin/blog/banimentos", {
                      method: "POST",
                      body: JSON.stringify({
                        usuarioId,
                        motivo: motivo.trim(),
                      }),
                    }),
                  "Usuário banido do blog.",
                )
              }
            >
              Confirmar banimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogo === "revogar"}
        onOpenChange={(o) => !o && !busy && setDialogo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar banimento do blog?</DialogTitle>
            <DialogDescription>
              A pessoa volta a poder comentar e curtir posts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)}>
              Cancelar
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                escrever(
                  () =>
                    fetchApi(`/api/admin/blog/banimentos/${usuarioId}`, {
                      method: "DELETE",
                    }),
                  "Banimento revogado.",
                )
              }
            >
              Confirmar revogação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

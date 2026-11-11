import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi";
import { formatarData } from "@/lib/datetime";
import type { PagedModel } from "@/types/admin.types";
import type { components } from "@/types/api-schema";

type Comentario = components["schemas"]["DaConta"];

/**
 * "Seus comentários no blog" (`/api/conta/comentarios`): lista e apagar com confirmação.
 * Quem nunca comentou não vê a seção; se a primeira carga falhar, ela também some (não é o foco da tela).
 */
export function ComentariosDoBlog() {
  const { fetchApi } = useApi();
  const [itens, setItens] = useState<Comentario[]>([]);
  const [alvo, setAlvo] = useState<Comentario | null>(null);
  const [busy, setBusy] = useState(false);
  const carregouRef = useRef(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetchApi<PagedModel<Comentario>>(
        "/api/conta/comentarios?size=50",
        { showToast: false },
      );
      setItens(r?.content ?? []);
    } catch {
      // Só a primeira carga falha em silêncio (a seção some); no reload mantém a lista e avisa.
      if (carregouRef.current)
        toast.error("Não foi possível atualizar seus comentários.");
      else setItens([]);
      return;
    }
    carregouRef.current = true;
  }, [fetchApi]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function apagar() {
    if (!alvo) return;
    setBusy(true);
    try {
      await fetchApi(`/api/conta/comentarios/${alvo.id}`, { method: "DELETE" });
      toast.success("Comentário apagado.");
      setAlvo(null);
      await carregar();
    } catch {
      /* fetchApi já avisou com o toast */
    } finally {
      setBusy(false);
    }
  }

  if (itens.length === 0) return null;

  return (
    <section
      className="mt-8 rounded-2xl border border-clama-gold/15 bg-clama-night-deep px-5 py-4"
      aria-label="Seus comentários no blog"
    >
      <h2 className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-clama-gold-soft">
        Seus comentários no blog
      </h2>
      <ul className="mt-3 divide-y divide-clama-gold/10">
        {itens.map((c) => (
          <li
            key={c.id}
            className="flex items-start justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="break-words text-sm text-clama-cream">
                {c.conteudo}
              </p>
              <p className="mt-1 text-xs text-clama-cream/50">
                {c.postUrl ? (
                  <a
                    href={c.postUrl}
                    className="text-clama-gold hover:underline"
                  >
                    {c.postTitulo || c.postSlug}
                  </a>
                ) : (
                  c.postTitulo || c.postSlug
                )}
                {c.criadoEm && ` · ${formatarData(c.criadoEm)}`}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAlvo(c)}>
              Apagar
            </Button>
          </li>
        ))}
      </ul>

      <Dialog
        open={alvo !== null}
        onOpenChange={(o) => !o && !busy && setAlvo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar comentário?</DialogTitle>
            <DialogDescription>
              O comentário some do post e não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={busy} onClick={apagar}>
              Apagar comentário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

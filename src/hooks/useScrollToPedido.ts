import { useCallback, useEffect, type RefObject } from "react";

const HASH = "#fazer-pedido";

export function useScrollToPedido(
  ref: RefObject<HTMLElement | null>,
): () => void {
  const scrollToPedido = useCallback(() => {
    window.history.replaceState(null, "", HASH);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ref]);

  useEffect(() => {
    if (window.location.hash === HASH) {
      ref.current?.scrollIntoView({ behavior: "auto", block: "start" });
    }
    // Intencionalmente dispara uma vez no mount — mudanças de ref/hash em runtime não devem re-rolar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return scrollToPedido;
}

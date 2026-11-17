import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSessao } from "@/contexts/SessaoContext";

interface StickyNavProps {
  onCtaClick?: () => void;
  showCta?: boolean;
}

export function StickyNav({ onCtaClick, showCta = true }: StickyNavProps) {
  const navigate = useNavigate();
  const { usuario } = useSessao();
  const isAuthenticated = !!usuario;

  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
      return;
    }
    // Autenticado → área logada (aba Novo pedido) em vez da LP.
    // Anônimo → ancora da LP (form gratuito).
    if (isAuthenticated) {
      navigate("/conta?tab=novo");
      return;
    }
    navigate("/#fazer-pedido");
  };

  return (
    <nav
      className="sticky top-0 z-50 bg-[rgba(26,10,46,0.97)] py-[0.9rem] px-6"
      role="navigation"
      aria-label="Principal"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="font-serif text-[1.4rem] font-bold text-clama-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold rounded"
        >
          Clama
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/" className="font-sans text-[0.82rem] font-semibold text-clama-cream/80 hover:text-clama-gold transition-colors px-3 py-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold hidden sm:inline-block">
            Fazer um clamor
          </Link>
          <Link to="/como-funciona" className="font-sans text-[0.82rem] font-semibold text-clama-cream/80 hover:text-clama-gold transition-colors px-3 py-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold">
            Como funciona
          </Link>
          <a
            href="/blog"
            rel="external"
            className="font-sans text-[0.82rem] font-semibold text-clama-cream/80 hover:text-clama-gold transition-colors px-3 py-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold"
          >
            Blog
          </a>

          {/* "Entrar" / "Sua jornada" à esquerda do CTA. */}
          {isAuthenticated ? (
            <Link
              to="/conta"
              className="font-sans text-[0.82rem] font-semibold text-clama-cream/80 hover:text-clama-gold transition-colors px-3 py-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold"
            >
              Sua jornada
            </Link>
          ) : (
            <Link
              to="/login"
              className="font-sans text-[0.82rem] font-semibold text-clama-cream/80 hover:text-clama-gold transition-colors px-3 py-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold"
            >
              Entrar
            </Link>
          )}

          <button
            onClick={handleCtaClick}
            aria-hidden={!showCta}
            tabIndex={showCta ? 0 : -1}
            className={cn(
              "bg-clama-gold text-clama-night font-sans text-[0.82rem] font-bold py-2 px-5 rounded-full hover:bg-[#e8b530] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold",
              !showCta && "opacity-0 pointer-events-none",
            )}
          >
            Fazer pedido
          </button>
        </div>
      </div>
    </nav>
  );
}

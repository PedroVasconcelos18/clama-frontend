import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StickyNavProps {
  onCtaClick?: () => void;
  showCta?: boolean;
}

export function StickyNav({ onCtaClick, showCta = true }: StickyNavProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onCtaClick) {
      onCtaClick();
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

        <button
          onClick={handleClick}
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
    </nav>
  );
}

import { cn } from "@/lib/utils"

export type CTAClamarProps = {
  variant?: "bottom" | "after-comments"
  href?: string
  className?: string
}

const GLOW =
  "radial-gradient(60% 120% at 85% 50%, rgba(240,192,64,0.18), rgba(0,0,0,0) 60%), radial-gradient(50% 80% at 10% 100%, rgba(212,160,23,0.12), rgba(0,0,0,0) 60%)"

const COPY = {
  bottom: {
    eyebrow: "Sua oração personalizada",
    titulo: "Sua dor merece uma oração escrita especialmente pra você.",
    sub: "O Clama escreve orações personalizadas — pra um luto, uma decisão difícil, um filho rebelde, uma cura que demora. Conta o que tá no peito, a gente cuida do resto.",
    cta: "Quero clamar →",
  },
  "after-comments": {
    eyebrow: "Sua oração personalizada",
    titulo: "Pronta pra clamar?",
    sub: "Faça seu pedido — a gente devolve uma oração escrita em até 1h.",
    cta: "Faça seu pedido →",
  },
} as const

export function CTAClamar({
  variant = "bottom",
  href = "/",
  className,
}: CTAClamarProps) {
  const v = variant
  const { eyebrow, titulo, sub, cta } = COPY[v]
  const compact = v === "after-comments"

  return (
    <a
      href={href}
      rel="nofollow"
      aria-label="Quero pedir uma oração"
      data-slot="cta-clamar"
      data-variant={v}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-clama-gold/20 bg-clama-night-deep transition-all duration-300 hover:border-clama-gold/40 [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold/60",
        className,
      )}
    >
      {/* hairline gold no topo */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-clama-gold/60 to-transparent"
      />
      {/* glow radial */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: GLOW }}
      />

      <div
        className={cn(
          "relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between",
          compact ? "p-6 md:gap-8" : "p-8 md:p-10 md:gap-10",
        )}
      >
        <div className="min-w-0">
          <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-clama-gold-soft">
            {eyebrow}
          </p>
          <h3
            className={cn(
              "mt-3 font-serif leading-[1.15] text-clama-cream",
              compact ? "text-[1.4rem]" : "text-[1.7rem] md:text-[2.1rem]",
            )}
          >
            {titulo}
          </h3>
          <p
            className={cn(
              "mt-3 leading-relaxed text-clama-cream/60",
              compact ? "text-[0.88rem]" : "max-w-xl text-[0.95rem]",
            )}
          >
            {sub}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-clama-gold font-semibold text-clama-night transition-colors group-hover:bg-clama-gold-soft",
            compact ? "px-5 py-2.5 text-sm" : "px-7 py-3.5 text-[0.95rem]",
          )}
        >
          {cta}
        </span>
      </div>
    </a>
  )
}

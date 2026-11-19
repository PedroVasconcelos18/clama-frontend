import { OFERTAS } from "@/lib/ofertas"
import { cn } from "@/lib/utils"

export function OfertaPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Escolha sua contribuição" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {OFERTAS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "relative flex min-h-20 flex-col items-start gap-1 rounded-2xl border-2 bg-white p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold-soft",
            value === o.id ? "border-clama-gold-soft bg-[#fffbee]" : "border-clama-cream-warm hover:border-clama-gold-soft",
          )}
        >
          {o.destaque && (
            <span className="absolute -top-2.5 right-3 rounded-full bg-clama-night px-2 py-0.5 text-[11px] font-semibold text-clama-gold">
              {o.nome}
            </span>
          )}
          <span className="font-display text-2xl text-clama-night">{o.rotulo}</span>
          {o.nome && !o.destaque && <span className="text-sm text-clama-night/65">{o.nome}</span>}
        </button>
      ))}
    </div>
  )
}

import { formatCurrency } from "@/lib/formatters"
import { logoSrc } from "@/lib/instituicoes"
import { cn } from "@/lib/utils"
import type { Metas } from "@/lib/api/metas"
import type { Instituicao } from "@/types/instituicao.types"

type Props = {
  instituicoes: Instituicao[]
  metas: Metas | null
  /** Sem `onChange` é só leitura (a home). */
  value?: number | null
  onChange?: (id: number) => void
}

function Meta({ inst, arrecadado }: { inst: Instituicao; arrecadado: number }) {
  const meta = inst.metaMensalCentavos
  if (!meta || meta <= 0) return null // sem meta, sem barra
  const pct = Math.min(100, Math.round((arrecadado / meta) * 100))
  const un = inst.custoUnidadeCentavos && inst.unidade ? inst.unidade : null
  return (
    <>
      <span
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Meta de ${inst.nome}: ${pct}%`}
        className="block h-1.5 w-full overflow-hidden rounded-full bg-clama-night/10"
      >
        <span className="block h-full bg-clama-gold-soft" style={{ width: `${pct}%` }} />
      </span>
      <span className="flex justify-between gap-2 text-xs tabular-nums text-clama-night/60">
        <span>
          {formatCurrency(arrecadado)} de {formatCurrency(meta)}
        </span>
        <span>
          {un
            ? `${Math.floor(arrecadado / inst.custoUnidadeCentavos!)} de ${Math.floor(meta / inst.custoUnidadeCentavos!)} ${un}`
            : `${pct}% da meta`}
        </span>
      </span>
    </>
  )
}

export function InstituicaoPicker({ instituicoes, metas, value, onChange }: Props) {
  const arrecadado = (id: number) =>
    metas?.instituicoes.find((m) => m.instituicaoId === id)?.arrecadadoCentavos ?? 0

  const corpo = (i: Instituicao) => (
    <>
      <span className="flex items-center gap-2">
        <img src={logoSrc(i.logoUrl)} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded" />
        <b className="text-base">{i.nome}</b>
      </span>
      {i.causa && <span className="text-[13.5px] text-clama-night/70">{i.causa}</span>}
      <Meta inst={i} arrecadado={arrecadado(i.id)} />
    </>
  )
  const base = "flex w-full flex-col gap-2 rounded-2xl border-2 bg-white p-4 text-left text-clama-night"

  if (!onChange) {
    return (
      <ul className="grid list-none gap-3 p-0">
        {instituicoes.map((i) => (
          <li key={i.id} className={cn(base, "border-clama-cream-warm")}>
            {corpo(i)}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div role="radiogroup" aria-label="Instituição parceira" className="grid gap-3">
      {instituicoes.map((i) => (
        <button
          key={i.id}
          type="button"
          role="radio"
          aria-checked={value === i.id}
          onClick={() => onChange(i.id)}
          className={cn(
            base,
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold-soft",
            value === i.id ? "border-clama-gold-soft bg-[#fffbee]" : "border-clama-cream-warm hover:border-clama-gold-soft",
          )}
        >
          {corpo(i)}
        </button>
      ))}
    </div>
  )
}

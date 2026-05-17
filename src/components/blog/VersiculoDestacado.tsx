import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type VersiculoDestacadoProps = {
  referencia: string
  versao?: string
  children: ReactNode
  className?: string
}

export function VersiculoDestacado({
  referencia,
  versao = "ARC",
  children,
  className,
}: VersiculoDestacadoProps) {
  return (
    <blockquote
      className={cn(
        "versiculo",
        "my-6 rounded-md border-l-4 px-6 py-4",
        "bg-clama-gold text-clama-cream",
        "border-clama-gold-soft",
        className,
      )}
      data-referencia={referencia}
      data-versao={versao}
    >
      <p className="font-serif text-xl italic leading-relaxed">{children}</p>
      {referencia && (
        <cite className="mt-2 block font-serif text-sm not-italic opacity-80">
          {referencia}
          {versao ? ` (${versao})` : ""}
        </cite>
      )}
    </blockquote>
  )
}

import { Phone } from "lucide-react"

export const TEXTO_CVV =
  "Se você está pensando em tirar a própria vida, ligue para o CVV: 188, gratuito, 24 horas, ou converse pelo chat em cvv.org.br. Em perigo agora, ligue 192 (SAMU)."

export function AvisoCvv() {
  return (
    <aside
      role="note"
      aria-label="Apoio em crise"
      className="flex items-start gap-3 rounded-2xl border border-clama-gold bg-[#fffbee] p-4 text-[15px] text-clama-night"
    >
      <Phone className="mt-0.5 h-5 w-5 shrink-0 text-clama-gold-soft" aria-hidden="true" />
      <p>{TEXTO_CVV}</p>
    </aside>
  )
}

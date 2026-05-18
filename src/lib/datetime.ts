const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/**
 * Devolve uma string em pt-br tipo "há 3 horas", "ontem", "há 2 dias".
 * Para datas > 7 dias, devolve a data formatada (ex: "13 de mai. de 2026").
 */
export function tempoRelativo(
  iso: string | Date,
  now: Date = new Date(),
): string {
  const target = typeof iso === "string" ? new Date(iso) : iso
  const diff = now.getTime() - target.getTime()
  if (!Number.isFinite(diff) || Number.isNaN(diff)) return ""

  if (diff < MINUTE) return "agora há pouco"
  if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE)
    return mins === 1 ? "há 1 minuto" : `há ${mins} minutos`
  }
  if (diff < DAY) {
    const horas = Math.floor(diff / HOUR)
    return horas === 1 ? "há 1 hora" : `há ${horas} horas`
  }
  if (diff < 2 * DAY) return "ontem"
  if (diff < WEEK) {
    const dias = Math.floor(diff / DAY)
    return `há ${dias} dias`
  }
  return target.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const WORDS_PER_MINUTE = 200

/**
 * Estima tempo de leitura em minutos a partir de HTML (ou texto).
 * Strip tags, conta palavras, divide por 200 wpm, mínimo 1.
 */
export function readingTimeMin(htmlOrText: string): number {
  const text = htmlOrText.replace(/<[^>]+>/g, " ")
  const words = text.split(/\s+/).filter((w) => w.length > 0).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

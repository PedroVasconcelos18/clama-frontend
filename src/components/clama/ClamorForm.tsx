import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertCircle } from "lucide-react"
import { TEMAS, GUIA_PADRAO } from "@/lib/temas"
import { triar } from "@/lib/api/triagem"
import { lerRascunho, salvarRascunho } from "@/lib/rascunho"
import { cn } from "@/lib/utils"

const MINIMO = 3
const MSG_CURTA = "Escreva ao menos algumas palavras. Pode ser uma frase só, do jeito que vier."

/** O clamor: tema (opcional) e texto. Ao continuar, tria, guarda o rascunho e vai para a entrega. */
export function ClamorForm() {
  const navigate = useNavigate()
  const [inicial] = useState(lerRascunho)
  const [tema, setTema] = useState<string | null>(inicial?.tema ?? null)
  const [texto, setTexto] = useState(inicial?.texto ?? "")
  const [erro, setErro] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const guia = TEMAS.find((t) => t.id === tema)?.guia ?? GUIA_PADRAO

  async function continuar(e: React.FormEvent) {
    e.preventDefault()
    const limpo = texto.trim()
    if (limpo.length < MINIMO) {
      setErro(true)
      return
    }
    setErro(false)
    setEnviando(true)
    const risco = await triar(limpo) // nunca lança: null = falhou
    salvarRascunho({ tema, texto: limpo, risco })
    navigate("/entrega")
  }

  return (
    <form
      id="fazer-pedido"
      onSubmit={continuar}
      noValidate
      className="scroll-mt-20 flex flex-col gap-4 rounded-[24px] border border-clama-gold/25 bg-clama-night-soft p-6 md:p-8"
    >
      <label htmlFor="clamor" className="font-display text-2xl md:text-3xl text-clama-cream">
        O que pesa no seu coração hoje?
      </label>
      <div role="group" aria-label="Escolha um tema, se quiser" className="flex flex-wrap gap-2">
        {TEMAS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tema === t.id}
            onClick={() => setTema(tema === t.id ? null : t.id)}
            className={cn(
              "min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold",
              tema === t.id
                ? "border-clama-gold bg-clama-gold text-clama-night"
                : "border-clama-gold/30 text-clama-cream hover:border-clama-gold",
            )}
          >
            {t.rotulo}
          </button>
        ))}
      </div>
      <p id="guia" className="font-verse italic text-lg text-clama-cream/80">
        {guia}
      </p>
      <textarea
        id="clamor"
        value={texto}
        maxLength={2000}
        rows={6}
        onChange={(e) => setTexto(e.target.value)}
        aria-describedby={erro ? "guia erro-texto" : "guia"}
        aria-invalid={erro}
        placeholder="Escreva com suas palavras. Não precisa ser bonito, precisa ser seu."
        className="w-full resize-y rounded-[14px] border border-clama-gold/30 bg-clama-night p-3 font-sans text-base text-clama-cream placeholder:text-clama-cream/40 outline-none focus:border-clama-gold"
      />
      {erro && (
        <p id="erro-texto" role="alert" className="flex items-start gap-2 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{MSG_CURTA}</span>
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="min-h-12 rounded-full bg-clama-gold px-6 font-sans text-base font-bold text-clama-night hover:bg-[#e8b530] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-cream"
      >
        {enviando ? "Um instante..." : "Continuar"}
      </button>
      <p className="text-center text-sm text-clama-cream/60">
        Leva um minuto. Para fazer um clamor, você não precisa de conta.
      </p>
    </form>
  )
}

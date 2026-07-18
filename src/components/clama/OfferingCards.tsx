import { useState } from "react";
import { cn } from "@/lib/utils";
import { reaisToInt } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { type Plan } from "@/types/plano.types";

export type CanalEntrega = "EMAIL" | "WHATSAPP";

export interface OfferingState {
  selectedPlanId: string | null;
  valorLivre: number | null; // em centavos; null enquanto o input está vazio/inválido
  valorLivreActive: boolean; // modo "Livre" escolhido (independe de ter valor válido)
  gratuito: boolean;
}

interface OfferingCardsProps {
  planos: Plan[];
  selectedPlanId: string | null;
  valorLivre: number | null;
  /** Modo "Livre" ativo — controla seleção do card e visibilidade do input. */
  valorLivreActive: boolean;
  gratuito: boolean;
  /** Exibe o card "Gratuito". Default: false. */
  allowGratuito?: boolean;
  onChange: (state: OfferingState) => void;
  /**
   * Erro do valor livre, controlado pelo pai. Fica null durante a digitação;
   * o pai só o preenche ao tentar submeter (ver PedidoSection).
   */
  valorLivreError?: string | null;
  /** "light" (default) = LP; "dark" = variante /conta. */
  theme?: "light" | "dark";
}

const VALOR_MINIMO_REAIS = 1;

export function OfferingCards({
  planos,
  selectedPlanId,
  valorLivre,
  valorLivreActive,
  gratuito,
  allowGratuito = false,
  onChange,
  valorLivreError = null,
  theme = "light",
}: OfferingCardsProps) {
  const isDark = theme === "dark";
  const cardSelected = isDark
    ? "border-2 border-clama-gold bg-clama-gold/10"
    : "border-2 border-clama-gold bg-[#fffbee]";
  const cardIdle = isDark
    ? "border-2 border-clama-gold/20 bg-clama-night-deep hover:border-clama-gold/50"
    : "border-2 border-[#ede8d8] bg-white hover:border-clama-gold";
  const valorTexto = isDark ? "text-clama-cream" : "text-clama-night";
  const subTexto = isDark ? "text-clama-cream/50" : "text-[#888]";
  const [valorLivreInput, setValorLivreInput] = useState<string>(
    valorLivre ? String(valorLivre / 100) : ""
  );

  const handlePlanSelect = (planId: string) => {
    onChange({
      selectedPlanId: planId,
      valorLivre: null,
      valorLivreActive: false,
      gratuito: false,
    });
  };

  const handleGratuitoClick = () => {
    onChange({
      selectedPlanId: null,
      valorLivre: null,
      valorLivreActive: false,
      gratuito: true,
    });
  };

  // Emite o estado do valor livre a partir do texto do input. Mantém o modo
  // ativo (card marcado / input visível) MESMO quando o valor está vazio ou
  // abaixo do mínimo — nesses casos só zera `valorLivre` (o pai bloqueia o
  // submit e mostra o aviso apenas ao clicar no botão). Nunca desmarca aqui.
  const emitValorLivre = (rawInput: string) => {
    const numValue = parseFloat(rawInput);
    const valid = !isNaN(numValue) && numValue >= VALOR_MINIMO_REAIS;
    onChange({
      selectedPlanId: null,
      gratuito: false,
      valorLivreActive: true,
      valorLivre: valid ? reaisToInt(numValue) : null,
    });
  };

  const handleValorLivreClick = () => {
    const nextInput = valorLivreInput || String(VALOR_MINIMO_REAIS);
    setValorLivreInput(nextInput);
    emitValorLivre(nextInput);
  };

  const handleValorLivreChange = (value: string) => {
    setValorLivreInput(value);
    emitValorLivre(value);
  };

  return (
    <div className="space-y-4">
      <div
        role="radiogroup"
        aria-label="Escolha sua contribuição"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {planos.map((plano) => {
          const isSelected = selectedPlanId === plano.id;
          const isMostPopular = plano.ordem === 2;

          return (
            <button
              key={plano.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handlePlanSelect(plano.id)}
              className={cn(
                "relative rounded-[14px] py-[1.1rem] px-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold",
                isSelected ? cardSelected : cardIdle,
              )}
            >
              {isMostPopular && (
                <span
                  className={cn(
                    "font-sans text-[0.7rem] py-[2px] px-2 rounded-full inline-block mb-1",
                    isDark
                      ? "bg-clama-gold text-clama-night font-semibold"
                      : "bg-clama-night text-clama-gold",
                  )}
                >
                  Mais escolhido
                </span>
              )}

              {!isMostPopular && (
                <div className={cn("font-sans text-[0.75rem] mb-1", subTexto)}>
                  {plano.nome}
                </div>
              )}

              <div className={cn("text-[1.4rem] font-bold", valorTexto)}>
                {plano.valor_reais_str}
              </div>
              <div
                className={cn(
                  "font-sans text-[0.75rem] mt-1 leading-snug",
                  subTexto,
                )}
              >
                {plano.descricao}
              </div>
            </button>
          );
        })}

        {/* Card Gratuito */}
        {allowGratuito && (
          <button
            type="button"
            role="radio"
            aria-checked={gratuito}
            onClick={handleGratuitoClick}
            className={cn(
              "relative rounded-[14px] py-[1.1rem] px-3 text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold",
              gratuito ? cardSelected : cardIdle,
            )}
          >
            <div className={cn("text-base font-bold", valorTexto)}>Gratuito</div>
            <div
              className={cn(
                "font-sans text-[0.75rem] mt-1 leading-snug",
                subTexto,
              )}
            >
              Receba sua oração sem custo
            </div>
          </button>
        )}

        {/* Card Valor Livre */}
        <button
          type="button"
          role="radio"
          aria-checked={valorLivreActive}
          onClick={handleValorLivreClick}
          className={cn(
            "relative rounded-[14px] py-[1.1rem] px-3 text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold",
            valorLivreActive ? cardSelected : cardIdle,
          )}
        >
          <div className={cn("text-base font-bold", valorTexto)}>Livre</div>
          <div
            className={cn(
              "font-sans text-[0.75rem] mt-1 leading-snug",
              subTexto,
            )}
          >
            Dê conforme o que o coração manda
          </div>
        </button>
      </div>

      {/* Campo de valor livre */}
      {valorLivreActive && (
        <div className="max-w-[640px] mx-auto">
          <label
            className={cn(
              "font-sans text-[0.8rem] font-semibold tracking-[0.5px] uppercase block mb-1",
              isDark ? "text-clama-cream" : "text-clama-night",
            )}
          >
            Valor da contribuição (mín. R$ 1,00)
          </label>
          <div className="relative">
            <span
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none font-sans text-[0.95rem] font-semibold",
                isDark ? "text-clama-cream/70" : "text-clama-night/60",
              )}
              aria-hidden="true"
            >
              R$
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={VALOR_MINIMO_REAIS}
              step={0.01}
              value={valorLivreInput}
              onChange={(e) => handleValorLivreChange(e.target.value)}
              placeholder="1,00"
              className={cn(
                "w-full py-3 pl-10 pr-4 border-[1.5px] rounded-[10px] text-[0.95rem] font-sans outline-none",
                isDark
                  ? "border-clama-gold/30 text-clama-cream bg-clama-night [color-scheme:dark] placeholder:text-clama-cream/35 focus:border-clama-gold"
                  : "border-[#e0d8f0] text-clama-night bg-white focus:border-[#8a5cf6]",
              )}
              aria-label="Valor da contribuição em reais"
            />
          </div>
          {valorLivreError && (
            <p
              className={cn(
                "text-sm mt-2",
                isDark ? "text-red-300" : "text-[#8a5cf6]",
              )}
            >
              {valorLivreError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

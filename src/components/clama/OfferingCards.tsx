import { useState } from "react";
import { cn } from "@/lib/utils";
import { reaisToInt } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { type Plan } from "@/types/plano.types";

export type CanalEntrega = "EMAIL" | "WHATSAPP";

export interface OfferingState {
  selectedPlanId: string | null;
  valorLivre: number | null; // em centavos
  gratuito: boolean;
}

interface OfferingCardsProps {
  planos: Plan[];
  selectedPlanId: string | null;
  valorLivre: number | null;
  gratuito: boolean;
  /** Exibe o card "Gratuito". Default: false. */
  allowGratuito?: boolean;
  onChange: (state: OfferingState) => void;
  /** "light" (default) = LP; "dark" = variante /conta. */
  theme?: "light" | "dark";
}

const VALOR_MINIMO_REAIS = 5.99;

export function OfferingCards({
  planos,
  selectedPlanId,
  valorLivre,
  gratuito,
  allowGratuito = false,
  onChange,
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
  const [valorLivreError, setValorLivreError] = useState<string | null>(null);
  const isValorLivreSelected =
    !gratuito && selectedPlanId === null && valorLivre !== null;

  const handlePlanSelect = (planId: string) => {
    setValorLivreError(null);
    onChange({
      selectedPlanId: planId,
      valorLivre: null,
      gratuito: false,
    });
  };

  const handleGratuitoClick = () => {
    setValorLivreError(null);
    onChange({
      selectedPlanId: null,
      valorLivre: null,
      gratuito: true,
    });
  };

  const handleValorLivreClick = () => {
    onChange({
      selectedPlanId: null,
      valorLivre: valorLivre ?? reaisToInt(VALOR_MINIMO_REAIS),
      gratuito: false,
    });
    if (!valorLivreInput) {
      setValorLivreInput(String(VALOR_MINIMO_REAIS));
    }
  };

  const handleValorLivreChange = (value: string) => {
    setValorLivreInput(value);
    const numValue = parseFloat(value);

    if (isNaN(numValue) || numValue < VALOR_MINIMO_REAIS) {
      setValorLivreError("O valor mínimo é R$ 5,99.");
      onChange({
        selectedPlanId: null,
        valorLivre: null,
        gratuito: false,
      });
    } else {
      setValorLivreError(null);
      onChange({
        selectedPlanId: null,
        valorLivre: reaisToInt(numValue),
        gratuito: false,
      });
    }
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
          aria-checked={isValorLivreSelected}
          onClick={handleValorLivreClick}
          className={cn(
            "relative rounded-[14px] py-[1.1rem] px-3 text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold",
            isValorLivreSelected ? cardSelected : cardIdle,
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
      {isValorLivreSelected && (
        <div className="max-w-[640px] mx-auto">
          <label
            className={cn(
              "font-sans text-[0.8rem] font-semibold tracking-[0.5px] uppercase block mb-1",
              isDark ? "text-clama-cream" : "text-clama-night",
            )}
          >
            Valor da contribuição (mín. R$ 5,99)
          </label>
          <Input
            type="number"
            min={VALOR_MINIMO_REAIS}
            step={0.01}
            value={valorLivreInput}
            onChange={(e) => handleValorLivreChange(e.target.value)}
            placeholder="R$ 5,99"
            className={cn(
              "w-full py-3 px-4 border-[1.5px] rounded-[10px] text-[0.95rem] font-sans outline-none",
              isDark
                ? "border-clama-gold/30 text-clama-cream bg-clama-night [color-scheme:dark] placeholder:text-clama-cream/35 focus:border-clama-gold"
                : "border-[#e0d8f0] text-clama-night bg-white focus:border-[#8a5cf6]",
            )}
            aria-label="Valor da contribuição em reais"
          />
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

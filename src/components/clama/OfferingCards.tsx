import { useState } from "react";
import { cn } from "@/lib/utils";
import { reaisToInt } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { type Plan } from "@/types/plano.types";

export type CanalEntrega = "EMAIL" | "WHATSAPP";

export interface OfferingState {
  selectedPlanId: string | null;
  valorLivre: number | null; // em centavos
}

interface OfferingCardsProps {
  planos: Plan[];
  selectedPlanId: string | null;
  valorLivre: number | null;
  onChange: (state: OfferingState) => void;
}

const VALOR_MINIMO_REAIS = 5.99;

export function OfferingCards({
  planos,
  selectedPlanId,
  valorLivre,
  onChange,
}: OfferingCardsProps) {
  const [valorLivreInput, setValorLivreInput] = useState<string>(
    valorLivre ? String(valorLivre / 100) : ""
  );
  const [valorLivreError, setValorLivreError] = useState<string | null>(null);
  const isValorLivreSelected = selectedPlanId === null && valorLivre !== null;

  const handlePlanSelect = (planId: string) => {
    setValorLivreError(null);
    onChange({
      selectedPlanId: planId,
      valorLivre: null,
    });
  };

  const handleValorLivreClick = () => {
    onChange({
      selectedPlanId: null,
      valorLivre: valorLivre ?? reaisToInt(VALOR_MINIMO_REAIS),
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
      });
    } else {
      setValorLivreError(null);
      onChange({
        selectedPlanId: null,
        valorLivre: reaisToInt(numValue),
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
                isSelected
                  ? "border-2 border-clama-gold bg-[#fffbee]"
                  : "border-2 border-[#ede8d8] bg-white hover:border-clama-gold"
              )}
            >
              {isMostPopular && (
                <span className="font-sans text-[0.7rem] bg-clama-night text-clama-gold py-[2px] px-2 rounded-full inline-block mb-1">
                  Mais escolhido
                </span>
              )}

              {!isMostPopular && (
                <div className="font-sans text-[0.75rem] text-[#888] mb-1">
                  {plano.nome}
                </div>
              )}

              <div className="text-[1.4rem] font-bold text-clama-night">
                {plano.valor_reais_str}
              </div>
              <div className="font-sans text-[0.75rem] text-[#888] mt-1 leading-snug">
                {plano.descricao}
              </div>
            </button>
          );
        })}

        {/* Card Valor Livre */}
        <button
          type="button"
          role="radio"
          aria-checked={isValorLivreSelected}
          onClick={handleValorLivreClick}
          className={cn(
            "relative rounded-[14px] py-[1.1rem] px-3 text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clama-gold",
            isValorLivreSelected
              ? "border-2 border-clama-gold bg-[#fffbee]"
              : "border-2 border-[#ede8d8] bg-white hover:border-clama-gold"
          )}
        >
          <div className="text-base font-bold text-clama-night">
            Livre
          </div>
          <div className="font-sans text-[0.75rem] text-[#888] mt-1 leading-snug">
            Dê conforme o que o coração manda
          </div>
        </button>
      </div>

      {/* Campo de valor livre */}
      {isValorLivreSelected && (
        <div className="max-w-[640px] mx-auto">
          <label className="font-sans text-[0.8rem] font-semibold text-clama-night tracking-[0.5px] uppercase block mb-1">
            Valor da contribuição (mín. R$ 5,99)
          </label>
          <Input
            type="number"
            min={VALOR_MINIMO_REAIS}
            step={0.01}
            value={valorLivreInput}
            onChange={(e) => handleValorLivreChange(e.target.value)}
            placeholder="R$ 5,99"
            className="w-full py-3 px-4 border-[1.5px] border-[#e0d8f0] rounded-[10px] text-[0.95rem] font-sans text-clama-night bg-white outline-none focus:border-[#8a5cf6]"
            aria-label="Valor da contribuição em reais"
          />
          {valorLivreError && (
            <p className="text-sm text-[#8a5cf6] mt-2">{valorLivreError}</p>
          )}
        </div>
      )}
    </div>
  );
}

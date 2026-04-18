import { Button } from "@/components/ui/button";

interface FinalCtaSectionProps {
  onCtaClick?: () => void;
}

export function FinalCtaSection({ onCtaClick }: FinalCtaSectionProps) {
  return (
    <section
      aria-labelledby="final-cta-title"
      className="bg-clama-cream py-12 px-6 text-center"
    >
      <div className="max-w-[440px] mx-auto">
        {/* Title */}
        <h2
          id="final-cta-title"
          className="font-serif text-clama-night text-[1.7rem] mb-4"
        >
          A oração que transforma é a que também liberta
        </h2>

        {/* Boff citation */}
        <p className="font-serif text-[#555] text-[0.95rem] italic leading-relaxed mb-8">
          "O clamor dos pobres é a voz de Deus no mundo. E Deus, como nos diz Boff, não é solidão — é comunhão."
        </p>

        {/* CTA Button */}
        <Button
          variant="gold"
          size="lg"
          onClick={onCtaClick}
          className="h-14 px-12 text-[1.1rem] font-bold rounded-full"
        >
          Clama — a partir de R$ 1,99
        </Button>
      </div>
    </section>
  );
}

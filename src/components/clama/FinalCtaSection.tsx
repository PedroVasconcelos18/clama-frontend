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

        {/* Verse */}
        <p className="font-serif text-[#555] text-[0.95rem] italic leading-relaxed mb-2">
          "Clamam os justos, e o Senhor os ouve, e os livra de todas as suas angústias."
        </p>
        <p className="font-sans text-clama-gold text-[0.72rem] tracking-[1.5px] uppercase mb-8">
          Salmo 34:17
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

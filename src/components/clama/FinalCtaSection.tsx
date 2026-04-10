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
      <div className="max-w-[380px] mx-auto">
        {/* Title */}
        <h2
          id="final-cta-title"
          className="font-serif text-clama-night text-[1.7rem] mb-4"
        >
          Seu milagre está esperando por você
        </h2>

        {/* Verse */}
        <p className="font-sans text-[#666] text-[0.95rem] leading-relaxed mb-8">
          "E tudo o que pedirdes em oração, crendo, recebereis." — Mateus 21:22
        </p>

        {/* CTA Button */}
        <Button
          variant="gold"
          size="lg"
          onClick={onCtaClick}
          className="h-14 px-12 text-[1.1rem] font-bold rounded-full"
        >
          Clama agora — a partir de R$ 20
        </Button>
      </div>
    </section>
  );
}

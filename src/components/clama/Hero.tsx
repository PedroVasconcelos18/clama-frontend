import { Button } from "@/components/ui/button";
import { VerseCard } from "./VerseCard";

interface HeroProps {
  onCtaClick?: () => void;
}

export function Hero({ onCtaClick }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative bg-clama-night overflow-hidden py-12 md:py-16
        before:content-[''] before:absolute before:top-[-60px] before:left-1/2 before:-translate-x-1/2
        before:w-[300px] before:h-[300px] before:bg-[rgba(212,160,23,0.15)] before:rounded-full
        before:pointer-events-none"
    >
      <div className="relative z-10 w-full max-w-xl mx-auto px-6 text-center">
        {/* Logo */}
        <div className="font-serif text-[2.8rem] font-bold tracking-tight text-clama-gold mb-1">
          Clama<span className="text-white">.</span>
        </div>

        {/* Eyebrow */}
        <div className="font-sans text-[0.85rem] tracking-[4px] uppercase text-white/55 mb-8">
          O clamor que nasce do coração do povo
        </div>

        {/* Title */}
        <h1
          id="hero-title"
          className="font-serif text-white text-[2rem] leading-[1.25] mb-4 max-w-[480px] mx-auto"
        >
          Oremos pela libertação do que te oprime — em você, nos seus e no mundo
        </h1>

        {/* Subtitle */}
        <p className="font-sans text-white/70 text-base max-w-[420px] mx-auto mb-8 leading-relaxed">
          Deus não é o Deus dos poderosos. É o Deus que ouve os lamentos de todos, abraça a fragilidade humana e age com infinita ternura.
        </p>

        {/* CTA Button */}
        <Button
          variant="gold"
          size="lg"
          onClick={onCtaClick}
          className="h-14 px-10 text-[1.05rem] font-bold rounded-full"
        >
          Levar meu clamor
        </Button>

        {/* Verse */}
        <div className="mt-10">
          <VerseCard
            verse="O Espírito do Senhor está sobre mim, porque me ungiu para evangelizar os pobres. Enviou-me para proclamar libertação aos cativos."
            reference="Lucas 4:18"
            variant="hero"
          />
        </div>

      </div>
    </section>
  );
}

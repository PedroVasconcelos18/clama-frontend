import { cn } from "@/lib/utils";

interface VerseCardProps {
  verse: string;
  reference: string;
  className?: string;
  variant?: "hero" | "default";
}

export function VerseCard({ verse, reference, className, variant = "default" }: VerseCardProps) {
  if (variant === "hero") {
    return (
      <blockquote
        className={cn(
          "border border-clama-gold/35 rounded-xl py-5 px-6 max-w-[400px] mx-auto",
          className
        )}
      >
        <p className="font-serif text-white/85 text-base italic leading-relaxed">
          "{verse}"
        </p>
        <footer className="mt-2 font-sans text-clama-gold text-[0.78rem] tracking-[1px] uppercase">
          {reference}
        </footer>
      </blockquote>
    );
  }

  return (
    <blockquote
      className={cn(
        "border border-clama-gold/20 bg-clama-gold/5 rounded-xl px-6 py-4 max-w-md mx-auto",
        className
      )}
    >
      <p className="font-serif text-clama-cream/90 text-lg italic leading-relaxed">
        "{verse}"
      </p>
      <footer className="mt-2 text-clama-gold text-sm">— {reference}</footer>
    </blockquote>
  );
}

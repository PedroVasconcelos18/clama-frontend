import { pillars } from "@/data/pillars";

export function PillarsSection() {
  return (
    <section
      aria-labelledby="pillars-title"
      className="bg-clama-night py-12 px-6"
    >
      <div className="max-w-[640px] mx-auto text-center">
        {/* Eyebrow */}
        <p className="font-sans text-[0.9rem] text-white/50 tracking-[2px] uppercase mb-2">
          A palavra que não consola — transforma
        </p>

        {/* Title */}
        <h2
          id="pillars-title"
          className="font-serif text-white text-[1.7rem] mb-10"
        >
          Pilares do Evangelho que guiam o nosso clamor
        </h2>

        {/* Verse Cards */}
        <div className="grid grid-cols-1 gap-5">
          {pillars.map((pillar) => (
            <blockquote
              key={pillar.referencia}
              className="border-l-[3px] border-clama-gold bg-white/[0.06] rounded-r-[10px] py-4 px-5 text-left"
            >
              {/* Pillar Badge */}
              <span className="inline-block font-sans text-[0.7rem] bg-clama-gold/20 text-clama-gold px-[10px] py-[3px] rounded-full tracking-[1px] uppercase mb-2">
                {pillar.tag}
              </span>
              {/* Verse Text */}
              <p className="font-serif text-white/90 text-[0.95rem] italic leading-relaxed">
                "{pillar.texto}"
              </p>
              {/* Reference */}
              <footer className="font-sans text-clama-gold text-[0.75rem] tracking-[1.5px] uppercase mt-2">
                {pillar.referencia}
              </footer>
            </blockquote>
          ))}
        </div>

        {/* Boff citation + institutional paragraph */}
        <div className="mt-10 text-left max-w-[560px] mx-auto">
          <blockquote className="font-serif text-white/85 text-[0.95rem] italic leading-relaxed border-l-[3px] border-clama-gold/60 pl-5">
            "A opção pelos pobres nasce da fé no Deus da vida, que ouve o clamor do oprimido e desce para libertá-lo."
            <footer className="mt-2 not-italic font-sans text-clama-gold text-[0.7rem] tracking-[1.5px] uppercase">
              Leonardo Boff
            </footer>
          </blockquote>

          <p className="mt-6 font-serif text-white/80 text-[0.95rem] leading-relaxed text-center">
            O Clama nasceu da convicção de que a oração não é fuga do mundo — é mergulho nele, com olhos abertos e coração partido pelo que parte o coração de Deus.
          </p>
        </div>
      </div>
    </section>
  );
}

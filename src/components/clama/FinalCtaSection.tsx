export function FinalCtaSection() {
  return (
    <section
      aria-labelledby="final-cta-title"
      className="bg-clama-cream pt-12 pb-8 px-6 text-center"
    >
      <div className="max-w-[440px] mx-auto">
        <h2
          id="final-cta-title"
          className="font-serif text-clama-night text-[1.7rem] mb-4"
        >
          A oração que transforma é a que também liberta
        </h2>

        <p className="font-serif text-[#555] text-[0.95rem] italic leading-relaxed mb-2">
          "Clamam os justos, e o Senhor os ouve, e os livra de todas as suas angústias."
        </p>
        <p className="font-sans text-clama-gold text-[0.72rem] tracking-[1.5px] uppercase">
          Salmo 34:17
        </p>
      </div>
    </section>
  );
}

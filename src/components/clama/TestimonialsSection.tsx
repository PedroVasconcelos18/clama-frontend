import { testimonials } from "@/data/testimonials";

export function TestimonialsSection() {
  return (
    <section
      aria-labelledby="testimonials-title"
      className="bg-white py-12 px-6"
    >
      <div className="max-w-[780px] mx-auto text-center">
        {/* Eyebrow */}
        <p className="font-sans text-[0.9rem] text-[#888] tracking-[2px] uppercase mb-2">
          Clamores que encontraram resposta
        </p>

        {/* Title */}
        <h2
          id="testimonials-title"
          className="font-serif text-clama-night text-[1.7rem] mb-10"
        >
          Testemunhos de quem caminhou com a palavra
        </h2>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((testimonial, index) => (
            <blockquote
              key={index}
              className="bg-white border border-[#ede8d8] rounded-2xl p-6 text-left"
            >
              {/* Stars */}
              <div className="text-clama-gold text-base mb-3">
                ★★★★★
              </div>
              {/* Text */}
              <p className="font-serif text-[#444] text-[0.9rem] italic leading-relaxed mb-4">
                "{testimonial.text}"
              </p>
              {/* Name */}
              <p className="font-sans text-clama-night text-[0.8rem] font-semibold">
                {testimonial.name}
              </p>
              {/* City */}
              <p className="font-sans text-[#999] text-[0.75rem]">
                {testimonial.city}
              </p>
              {/* Illustrative Notice */}
              {testimonial.isIllustrative && (
                <p className="font-sans text-[#b08020] text-[0.68rem] italic mt-2">
                  Testemunho ilustrativo — será substituído por relato real antes do lançamento
                </p>
              )}
            </blockquote>
          ))}
        </div>

        {/* Legal disclaimer — obrigatório por CDC art. 37 + Termos 2.2 */}
        <p className="mt-8 font-sans text-[0.72rem] text-[#999] leading-relaxed max-w-[640px] mx-auto">
          Relatos pessoais de usuários sobre sua experiência com o conteúdo recebido. O Clama é uma plataforma de conteúdo de apoio espiritual motivacional. Resultados individuais podem variar.
        </p>
      </div>
    </section>
  );
}

import { useRef } from "react";
import { StickyNav } from "@/components/clama/StickyNav";
import { Hero } from "@/components/clama/Hero";
import { StepsSection } from "@/components/clama/StepsSection";
import { PillarsSection } from "@/components/clama/PillarsSection";
// import { TestimonialsSection } from "@/components/clama/TestimonialsSection";
import { FinalCtaSection } from "@/components/clama/FinalCtaSection";
import { PedidoSection } from "@/components/clama/PedidoSection";
import { Footer } from "@/components/clama/Footer";
import { useScrollToPedido } from "@/hooks/useScrollToPedido";
import { useIsInView } from "@/hooks/useIsInView";

export default function Landing() {
  const pedidoRef = useRef<HTMLElement>(null);
  const scrollToPedido = useScrollToPedido(pedidoRef);
  const isPedidoInView = useIsInView(pedidoRef);

  return (
    <div className="min-h-screen bg-clama-night">
      <StickyNav onCtaClick={scrollToPedido} showCta={!isPedidoInView} />

      <main>
        <Hero onCtaClick={scrollToPedido} />

        <StepsSection />

        <PillarsSection />

        {/* Testemunhos ocultos até termos relatos reais coletados com consentimento */}
        {/* <TestimonialsSection /> */}

        <FinalCtaSection />

        <PedidoSection ref={pedidoRef} />
      </main>

      <Footer />
    </div>
  );
}

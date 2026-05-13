import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { StickyNav } from "@/components/clama/StickyNav";
import { Hero } from "@/components/clama/Hero";
import { StepsSection } from "@/components/clama/StepsSection";
import { PillarsSection } from "@/components/clama/PillarsSection";
// import { TestimonialsSection } from "@/components/clama/TestimonialsSection";
import { FinalCtaSection } from "@/components/clama/FinalCtaSection";
import { PedidoSectionGratuito } from "@/components/clama/PedidoSectionGratuito";
import { Footer } from "@/components/clama/Footer";
import { useScrollToPedido } from "@/hooks/useScrollToPedido";
import { useIsInView } from "@/hooks/useIsInView";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const pedidoRef = useRef<HTMLElement>(null);
  const scrollToPedido = useScrollToPedido(pedidoRef);
  const isPedidoInView = useIsInView(pedidoRef);
  const { isAuthenticated } = useCustomerAuth();

  // Customer autenticado não tem form na LP — todos os CTAs ("Levar meu
  // clamor" no Hero, "Fazer pedido" no StickyNav) levam pra área logada
  // direto (aba Novo pedido). Anônimo segue o flow original (scroll até
  // o form gratuito embutido na LP).
  const handleCta = useCallback(() => {
    if (isAuthenticated) {
      navigate("/conta?tab=novo");
      return;
    }
    scrollToPedido();
  }, [isAuthenticated, navigate, scrollToPedido]);

  // CTA do StickyNav só esconde quando o form gratuito está em vista
  // (UX: evita CTA duplicado). Pra autenticado, não há form na LP →
  // CTA sticky fica sempre visível.
  const showCta = isAuthenticated ? true : !isPedidoInView;

  return (
    <div className="min-h-screen bg-clama-night">
      <StickyNav onCtaClick={handleCta} showCta={showCta} />

      <main>
        <Hero onCtaClick={handleCta} />

        <StepsSection />

        <PillarsSection />

        {/* Testemunhos ocultos até termos relatos reais coletados com consentimento */}
        {/* <TestimonialsSection /> */}

        <FinalCtaSection />

        {/* Form gratuito embutido só para anônimos. Autenticado nunca
            cai no fluxo freemium aqui — vai pra /conta?tab=novo via CTAs. */}
        {!isAuthenticated && <PedidoSectionGratuito ref={pedidoRef} />}
      </main>

      <Footer />
    </div>
  );
}

import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { StickyNav } from "@/components/clama/StickyNav";
import { Hero } from "@/components/clama/Hero";
import { StepsSection } from "@/components/clama/StepsSection";
import { PillarsSection } from "@/components/clama/PillarsSection";
import { TestimonialsSection } from "@/components/clama/TestimonialsSection";
import { FinalCtaSection } from "@/components/clama/FinalCtaSection";
import { Footer } from "@/components/clama/Footer";

export default function Landing() {
  const navigate = useNavigate();
  const stepsRef = useRef<HTMLElement>(null);

  const handleCtaClick = () => {
    navigate("/fazer-pedido");
  };

  return (
    <div className="min-h-screen bg-clama-night">
      <StickyNav />

      <main>
        <Hero onCtaClick={handleCtaClick} />

        <StepsSection ref={stepsRef} />

        <PillarsSection />

        <TestimonialsSection />

        <FinalCtaSection onCtaClick={handleCtaClick} />
      </main>

      <Footer />
    </div>
  );
}

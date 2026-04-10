import { Link } from "react-router-dom";

import { StickyNav } from "@/components/clama/StickyNav";
import { VerseCard } from "@/components/clama/VerseCard";
import { Button } from "@/components/ui/button";

export default function Cancelado() {
  return (
    <div className="min-h-screen bg-clama-night">
      <StickyNav />

      <main className="max-w-xl mx-auto px-4 py-12 text-center">
        {/* Icon */}
        <div className="mb-6">
          <span className="text-7xl" role="img" aria-label="Atenção">
            💙
          </span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl md:text-4xl text-clama-gold mb-4">
          Sem problema
        </h1>

        {/* Message */}
        <p className="text-clama-cream/80 text-lg mb-8 max-w-md mx-auto">
          O pagamento não foi concluído — e tudo bem. Quando você quiser, o
          Clama está aqui para ouvir seu clamor.
        </p>

        {/* Verse Card */}
        <VerseCard
          verse="Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei."
          reference="Mateus 11:28"
          className="mb-10"
        />

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/fazer-pedido">
            <Button className="h-12 px-8 w-full sm:w-auto">
              Tentar novamente
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="h-12 px-8 w-full sm:w-auto">
              Voltar para o início
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

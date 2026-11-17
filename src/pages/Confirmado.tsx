import { Link, useLocation, useSearchParams } from "react-router-dom";

import { StickyNav } from "@/components/clama/StickyNav";
import { Footer } from "@/components/clama/Footer";
import PastoralAlert from "@/components/utility/PastoralAlert";

/**
 * Página /confirmado — sucesso pós-confirmação do double opt-in.
 * O backend já rodou a saga (conta, bloqueio, status e geração da oração)
 * antes de a página `/confirmar` navegar pra cá. A página
 * só apresenta o estado e linka pra `/confirmacao?pedido_id=X` (polling).
 */
export default function Confirmado() {
  const [searchParams] = useSearchParams();
  const pedidoId = searchParams.get("pedido_id");
  // Freemium: o e-mail chega só pelo state do router (nunca pela URL).
  const email = (useLocation().state as { email?: string } | null)?.email;

  if (!pedidoId && email) {
    return (
      <div className="min-h-screen bg-white">
        <StickyNav />
        <main className="max-w-[480px] mx-auto px-6 py-12 text-center">
          <h1 className="font-serif text-[1.7rem] text-clama-night mb-3">Confira seu e-mail</h1>
          <p className="font-sans text-[#666] text-[0.95rem] leading-relaxed mb-8">
            Enviamos um link de confirmação para <strong>{email}</strong>. Ele vale por 24 horas. Se não encontrar,
            olhe a caixa de spam.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!pedidoId) {
    return (
      <div className="min-h-screen bg-white">
        <StickyNav />

        <main className="max-w-[480px] mx-auto px-6 py-12 text-center">
          <div className="mb-8">
            <PastoralAlert variant="error">
              Link inválido ou incompleto. Faça um novo pedido na{" "}
              <Link to="/" className="underline font-semibold">
                página inicial
              </Link>
              .
            </PastoralAlert>
          </div>

          <Link to="/">
            <button className="bg-white text-clama-night border-[1.5px] border-clama-night py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-[#f9f5ff] transition-colors">
              Fazer um novo pedido
            </button>
          </Link>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <StickyNav />

      <main className="max-w-[480px] mx-auto px-6 py-12 text-center">
        <div className="w-20 h-20 bg-[#fffbee] border-[3px] border-clama-gold rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-[2rem]" role="img" aria-label="Oração">
            🙏
          </span>
        </div>

        <h1 className="font-serif text-[1.7rem] text-clama-night mb-3">
          Sua oração está sendo preparada
        </h1>

        <p className="font-sans text-[#666] text-[0.95rem] leading-relaxed mb-8">
          Sua oração chega no seu e-mail em instantes. Se for a sua primeira
          vez, você também recebe um e-mail para criar sua senha. Enquanto
          aguarda, respire e se coloque em silêncio.
        </p>

        <div className="border border-[#e0d8f0] rounded-xl p-5 bg-clama-cream mb-8">
          <p className="font-serif text-[#444] text-[0.95rem] italic leading-relaxed">
            "O Espírito do Senhor está sobre mim, porque me ungiu para
            evangelizar os pobres. Enviou-me para proclamar libertação aos
            cativos."
          </p>
          <p className="font-sans text-[#8a5cf6] text-[0.78rem] tracking-[1px] uppercase mt-2">
            Lucas 4:18
          </p>
        </div>

        <Link to={`/confirmacao?pedido_id=${pedidoId}`}>
          <button className="bg-clama-gold text-clama-night py-[0.85rem] px-8 text-[0.95rem] font-bold font-sans rounded-full hover:opacity-90 transition-opacity">
            Acompanhar minha oração
          </button>
        </Link>
      </main>

      <Footer />
    </div>
  );
}

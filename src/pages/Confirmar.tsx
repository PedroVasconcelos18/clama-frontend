import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { StickyNav } from "@/components/clama/StickyNav";
import { Footer } from "@/components/clama/Footer";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/utility/LoadingSpinner";
import PastoralAlert from "@/components/utility/PastoralAlert";
import { PastoralApiError } from "@/lib/api";
import { confirmarPedidoGratuito } from "@/lib/api/freemium";

/**
 * Página /confirmar — tela intermediária do double opt-in (P-V2 wave 2).
 * O usuário chega aqui via clique no link do e-mail. O token só é consumido
 * por POST explícito (clique humano), o que blinda contra mail scanners
 * corporativos que fazem GET pre-fetch nos links inbound.
 */
export default function Confirmar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = (searchParams.get("token") ?? "").trim();

  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleConfirmar = useCallback(async () => {
    if (!token || submitting) return;
    setErro(null);
    setSubmitting(true);
    try {
      const res = await confirmarPedidoGratuito(token);
      navigate(`/confirmado?pedido_id=${res.pedido_id}`);
    } catch (err) {
      if (err instanceof PastoralApiError) {
        setErro(err.pastoralMessage);
      } else {
        setErro(
          "Não conseguimos confirmar agora. Tente novamente em alguns instantes.",
        );
      }
      setSubmitting(false);
    }
  }, [token, submitting, navigate]);

  if (!token) {
    return (
      <div className="min-h-screen bg-white">
        <StickyNav />
        <main className="max-w-[480px] mx-auto px-6 py-12 text-center">
          <div className="mb-8">
            <PastoralAlert variant="error">
              Link de confirmação inválido ou incompleto. Faça um novo
              pedido na{" "}
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
          Confirme sua oração
        </h1>

        <p className="font-sans text-[#666] text-[0.95rem] leading-relaxed mb-8">
          Recebemos seu pedido. Para receber sua oração no e-mail, basta
          confirmar abaixo.
        </p>

        {erro && (
          <div className="mb-6">
            <PastoralAlert variant="error">{erro}</PastoralAlert>
          </div>
        )}

        <Button
          variant="gold"
          size="lg"
          onClick={handleConfirmar}
          disabled={submitting}
          className="w-full h-12 text-[1.05rem] font-bold rounded-full"
        >
          {submitting ? (
            <>
              <LoadingSpinner size={20} className="mr-2" />
              Confirmando...
            </>
          ) : (
            "Confirmar minha oração"
          )}
        </Button>

        <div className="border border-[#e0d8f0] rounded-xl p-5 bg-clama-cream mt-8">
          <p className="font-serif text-[#444] text-[0.95rem] italic leading-relaxed">
            "Vinde a mim, todos os que estais cansados e oprimidos, que eu
            vos aliviarei."
          </p>
          <p className="font-sans text-[#8a5cf6] text-[0.78rem] tracking-[1px] uppercase mt-2">
            Mateus 11:28
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

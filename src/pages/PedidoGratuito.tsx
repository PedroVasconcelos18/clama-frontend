import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { StickyNav } from "@/components/clama/StickyNav";
import { Footer } from "@/components/clama/Footer";
import { PrayerFormGratuito } from "@/components/clama/PrayerFormGratuito";
import PastoralAlert from "@/components/utility/PastoralAlert";

import { criarPedidoGratuito } from "@/lib/api/freemium";
import { PastoralApiError } from "@/lib/api";
import type { PedidoGratuitoData } from "@/lib/schemas/pedido-gratuito";

interface SubmittedState {
  pedidoId: string;
  email: string;
}

export default function PedidoGratuito() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedState | null>(null);

  const handleSubmit = async (data: PedidoGratuitoData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const resp = await criarPedidoGratuito(data);
      toast.success(
        "Pedido recebido! Confira seu e-mail pra confirmar.",
      );
      setSubmitted({ pedidoId: resp.pedido_id, email: data.email });
    } catch (err) {
      const error = err as PastoralApiError;
      const msg =
        error?.pastoralMessage ??
        "Algo não saiu como o esperado. Tente novamente.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <StickyNav showCta={false} />

      <main className="max-w-[580px] mx-auto px-6 py-10">
        {/* Cabeçalho pastoral */}
        <header className="text-center mb-8">
          <p className="font-sans text-[0.78rem] tracking-[2px] uppercase text-[#8a5cf6] mb-2">
            Oferecimento da casa
          </p>
          <h1 className="font-serif text-[1.9rem] md:text-[2.25rem] text-clama-night leading-tight mb-3">
            Sua primeira oração — por nossa conta
          </h1>
          <p className="font-sans text-[1rem] text-[#666] leading-relaxed">
            Compartilhe seu coração. Após enviar, você receberá um e-mail pra
            confirmar — e então sua oração chega.
          </p>
        </header>

        {submitted ? (
          <SubmittedView email={submitted.email} />
        ) : (
          <>
            {submitError && (
              <div className="mb-6">
                <PastoralAlert variant="error">{submitError}</PastoralAlert>
              </div>
            )}

            <section>
              <div className="font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-[#8a5cf6] mb-4">
                Seus dados
              </div>
              <PrayerFormGratuito
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function SubmittedView({ email }: { email: string }) {
  return (
    <section
      className="text-center"
      role="region"
      aria-label="Confirmação enviada por e-mail"
    >
      <div className="w-20 h-20 bg-[#fffbee] border-[3px] border-clama-gold rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-[2rem]" role="img" aria-label="E-mail enviado">
          📩
        </span>
      </div>

      <h2 className="font-serif text-[1.6rem] text-clama-night mb-3">
        Confira seu e-mail
      </h2>

      <p className="font-sans text-[#666] text-[0.95rem] leading-relaxed mb-2">
        Mandamos um link de confirmação para
        <br />
        <strong className="text-clama-night">{email}</strong>.
      </p>
      <p className="font-sans text-[#666] text-[0.95rem] leading-relaxed mb-8">
        Clique no link pra finalizar e receber sua oração. O link vale 24h.
      </p>

      <div className="border border-[#e0d8f0] rounded-xl p-5 bg-clama-cream mb-8 text-left">
        <p className="font-sans text-[#888] text-[0.78rem] tracking-[1px] uppercase mb-2">
          Não recebeu?
        </p>
        <p className="font-sans text-[#666] text-[0.9rem] leading-relaxed">
          Confira a pasta de spam/lixo eletrônico. Se ainda não chegou em alguns
          minutos, entre em contato em{" "}
          <a
            href="mailto:contato@clama.me"
            className="text-[#8a5cf6] hover:underline"
          >
            contato@clama.me
          </a>
          .
        </p>
      </div>

      <Link to="/">
        <button className="bg-white text-clama-night border-[1.5px] border-clama-night py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-[#f9f5ff] transition-colors">
          Voltar para o início
        </button>
      </Link>
    </section>
  );
}

import { forwardRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PrayerFormGratuito } from "@/components/clama/PrayerFormGratuito";
import PastoralAlert from "@/components/utility/PastoralAlert";

import { criarPedidoGratuito } from "@/lib/api/freemium";
import { PastoralApiError } from "@/lib/api";
import type { PedidoGratuitoData } from "@/lib/schemas/pedido-gratuito";

interface SubmittedState {
  email: string;
}

/**
 * Versão gratuita da seção de pedido — exibida na Landing para visitantes
 * anônimos. Submete em `/api/freemium/pedidos/`. Backend pode responder:
 *
 * - 409 `user_ja_possui_conta` → user já tem conta. Backend manda
 *   `redirect: "/login"` no error body. Navegamos pra `/login` passando a
 *   `pastoralMessage` como flash via `location.state.flashMessage`.
 *   Login.tsx renderiza acima do form e limpa o state em one-shot.
 * - 409 `pedido_em_andamento` → pedido pendente do mesmo identificador
 *   aguardando confirmação por email. Toast pastoral + mantém form preenchido.
 * - Demais erros → comportamento legado (PastoralAlert + toast).
 */
export interface PedidoSectionGratuitoProps {
  /** "light" (default) = visual original; "dark" = tema da LP redesenhada. */
  theme?: "light" | "dark";
}

export const PedidoSectionGratuito = forwardRef<
  HTMLElement,
  PedidoSectionGratuitoProps
>(({ theme = "light" }, ref) => {
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedState | null>(null);

  const handleSubmit = async (data: PedidoGratuitoData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await criarPedidoGratuito(data);
      toast.success("Pedido recebido! Confira seu e-mail pra confirmar.");
      setSubmitted({ email: data.email });
    } catch (err) {
      const error = err as PastoralApiError;
      const msg =
        error?.pastoralMessage ??
        "Algo não saiu como o esperado. Tente novamente.";

      // User já tem conta — backend manda redirect: "/login" no error.
      // Navegamos com flashMessage no location.state — Login.tsx renderiza
      // como Alert pastoral acima do form em one-shot.
      if (error?.code === "user_ja_possui_conta") {
        const redirect =
          (typeof error.extra?.redirect === "string" && error.extra.redirect) ||
          "/login";
        navigate(redirect, {
          state: { flashMessage: msg, next: "/" },
        });
        return;
      }

      // Pedido pendente — toast pastoral + mantém form preenchido.
      if (error?.code === "pedido_em_andamento") {
        toast.error(msg);
        setSubmitError(msg);
        return;
      }

      // Erro genérico.
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      ref={ref}
      id="fazer-pedido"
      className={
        isDark
          ? "scroll-mt-20 bg-clama-night"
          : "bg-white scroll-mt-20"
      }
    >
      <div className="max-w-[580px] mx-auto px-6 py-8">
        {submitted ? (
          <SubmittedView email={submitted.email} isDark={isDark} />
        ) : (
          <>
            {submitError && (
              <div className="mb-6">
                <PastoralAlert variant="error">{submitError}</PastoralAlert>
              </div>
            )}

            <header className="text-center mb-8">
              <p
                className={`font-sans text-[0.78rem] tracking-[2px] uppercase mb-2 ${isDark ? "text-clama-gold-soft" : "text-[#8a5cf6]"}`}
              >
                Oferecimento da casa
              </p>
              <h2
                className={`font-serif text-[1.6rem] md:text-[1.9rem] leading-tight mb-3 ${isDark ? "text-clama-cream" : "text-clama-night"}`}
              >
                Sua primeira oração
              </h2>
              <p
                className={`font-sans text-[0.95rem] leading-relaxed ${isDark ? "text-clama-cream/55" : "text-[#666]"}`}
              >
                Compartilhe seu coração. Após enviar, você receberá um e-mail
                pra confirmar — e então sua oração chega.
              </p>
            </header>

            <section>
              <div
                className={`font-sans text-[0.72rem] font-bold tracking-[2px] uppercase mb-4 ${isDark ? "text-clama-gold-soft" : "text-[#8a5cf6]"}`}
              >
                Seus dados
              </div>
              <PrayerFormGratuito
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                theme={theme}
              />
            </section>
          </>
        )}
      </div>
    </section>
  );
});

PedidoSectionGratuito.displayName = "PedidoSectionGratuito";

function SubmittedView({
  email,
  isDark,
}: {
  email: string
  isDark: boolean
}) {
  return (
    <section
      className="text-center"
      role="region"
      aria-label="Confirmação enviada por e-mail"
    >
      <div
        className={`w-20 h-20 border-[3px] border-clama-gold rounded-full flex items-center justify-center mx-auto mb-6 ${isDark ? "bg-clama-gold/10" : "bg-[#fffbee]"}`}
      >
        <span className="text-[2rem]" role="img" aria-label="E-mail enviado">
          📩
        </span>
      </div>

      <h2
        className={`font-serif text-[1.6rem] mb-3 ${isDark ? "text-clama-cream" : "text-clama-night"}`}
      >
        Confira seu e-mail
      </h2>

      <p
        className={`font-sans text-[0.95rem] leading-relaxed mb-2 ${isDark ? "text-clama-cream/60" : "text-[#666]"}`}
      >
        Mandamos um link de confirmação para
        <br />
        <strong className={isDark ? "text-clama-cream" : "text-clama-night"}>
          {email}
        </strong>
        .
      </p>
      <p
        className={`font-sans text-[0.95rem] leading-relaxed mb-8 ${isDark ? "text-clama-cream/60" : "text-[#666]"}`}
      >
        Clique no link pra finalizar e receber sua oração. O link vale 24h.
      </p>

      <div
        className={`rounded-xl p-5 mb-8 text-left border ${isDark ? "border-clama-gold/20 bg-clama-night-deep" : "border-[#e0d8f0] bg-clama-cream"}`}
      >
        <p
          className={`font-sans text-[0.78rem] tracking-[1px] uppercase mb-2 ${isDark ? "text-clama-gold-soft" : "text-[#888]"}`}
        >
          Não recebeu?
        </p>
        <p
          className={`font-sans text-[0.9rem] leading-relaxed ${isDark ? "text-clama-cream/60" : "text-[#666]"}`}
        >
          Confira a pasta de spam/lixo eletrônico. Se ainda não chegou em
          alguns minutos, entre em contato em{" "}
          <a
            href="mailto:contato@clama.me"
            className={
              isDark
                ? "text-clama-gold hover:underline"
                : "text-[#8a5cf6] hover:underline"
            }
          >
            contato@clama.me
          </a>
          .
        </p>
      </div>

      <Link to="/">
        <button
          className={
            isDark
              ? "bg-transparent text-clama-cream border-[1.5px] border-clama-gold/40 py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-clama-gold/10 transition-colors"
              : "bg-white text-clama-night border-[1.5px] border-clama-night py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-[#f9f5ff] transition-colors"
          }
        >
          Voltar para o início
        </button>
      </Link>
    </section>
  );
}

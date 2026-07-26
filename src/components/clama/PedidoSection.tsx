import { forwardRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { apiFetch, PastoralApiError } from "@/lib/api";
import { reaisToInt } from "@/lib/formatters";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useCustomerApi } from "@/hooks/useCustomerApi";
import { criarPedidoGratuito } from "@/lib/api/freemium";
import { criarDoacaoAnonima, gerarCheckout } from "@/lib/api/doacoes";
import { type Plan } from "@/types/plano.types";
import { type Instituicao } from "@/types/instituicao.types";
import { type PedidoFormData } from "@/lib/schemas/pedido";
import { type PedidoGratuitoData } from "@/lib/schemas/pedido-gratuito";

import { PrayerForm } from "@/components/clama/PrayerForm";
import { PrayerFormGratuito } from "@/components/clama/PrayerFormGratuito";
import { SubmittedView } from "@/components/clama/PedidoSectionGratuito";
import { InstituicaoSelect } from "@/components/clama/InstituicaoSelect";
import {
  OfferingCards,
  type OfferingState,
} from "@/components/clama/OfferingCards";
// ChannelToggle comentado: só temos e-mail por enquanto. O type
// CanalEntrega segue em uso (estado do draft fixo em "EMAIL").
import {
  // ChannelToggle,
  type CanalEntrega,
} from "@/components/clama/ChannelToggle";
import { Divider } from "@/components/utility/Divider";
import PastoralAlert from "@/components/utility/PastoralAlert";
import LoadingSpinner from "@/components/utility/LoadingSpinner";
import { Button } from "@/components/ui/button";

interface FormDraftState {
  formData: Partial<PedidoFormData>;
  offering: OfferingState;
  canal: CanalEntrega;
}

const INITIAL_DRAFT: FormDraftState = {
  formData: {},
  offering: {
    selectedPlanId: null,
    valorLivre: null,
    valorLivreActive: false,
    gratuito: false,
  },
  canal: "EMAIL",
};

// Valor livre pré-selecionado por padrão (deve casar com o mínimo do
// OfferingCards / da API).
const VALOR_LIVRE_PADRAO_REAIS = 1;

export interface PedidoSectionProps {
  /**
   * "light" (default) = visual original, usado na Landing Page.
   * "dark" = variante pro tema escuro da /conta (conta-design).
   */
  theme?: "light" | "dark";
}

/**
 * Seção única de pedido — usada logada (/conta) e anônima (Landing).
 *
 * Dois tipos de pedido: **Gratuito** e **Valor livre** (pago). O caminho de
 * envio deriva do estado de autenticação e do tipo escolhido:
 *
 *  |            | Gratuito                       | Livre (pago)                         |
 *  |------------|--------------------------------|--------------------------------------|
 *  | Logado     | POST /api/pedidos/gratuito/     | POST /api/pedidos/ + /checkout/       |
 *  | Anônimo    | POST /api/freemium/pedidos/     | POST /api/doacoes/ + /checkout/       |
 *
 * Anônimo usa o `PrayerFormGratuito` (Turnstile invisível + fingerprint +
 * consent). O grátis anônimo é double opt-in por e-mail (mostra `SubmittedView`).
 */
export const PedidoSection = forwardRef<HTMLElement, PedidoSectionProps>(
  ({ theme = "light" }, ref) => {
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { isAuthenticated, user } = useCustomerAuth();
  const { customerFetch } = useCustomerApi();

  // Cliente logado: semeia "Seus dados" com o cadastro dele (editável).
  // Anônimo: sem prefill.
  const prefill =
    isAuthenticated && user
      ? {
          nome: user.nome_completo || "",
          email: user.email || "",
          cpf_cnpj: user.cpf_cnpj || "",
          telefone: user.telefone || "",
          idade: user.idade ?? null,
          sexo: user.sexo || "",
        }
      : undefined;

  const [planos, setPlanos] = useState<Plan[]>([]);
  const [isLoadingPlanos, setIsLoadingPlanos] = useState(true);
  const [planosError, setPlanosError] = useState<string | null>(null);

  // Instituição é opcional e não deve travar o fluxo do pedido: uma falha ao
  // carregar apenas deixa o dropdown vazio (só "Sem instituição").
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [isLoadingInstituicoes, setIsLoadingInstituicoes] = useState(true);
  const [instituicaoId, setInstituicaoId] = useState<string | null>(null);

  const handleDraftSaved = useCallback(() => {
    toast.info("Seu rascunho está seguro.", { duration: 2500 });
  }, []);

  const { value: draft, setValue: setDraft, clearDraft } = useFormDraft<FormDraftState>(
    "clama:form-draft",
    INITIAL_DRAFT,
    handleDraftSaved,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Só vira true ao tentar enviar — usado pra exibir o aviso do valor livre.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  // Grátis anônimo: guarda o e-mail pra tela "Confira seu e-mail".
  const [submitted, setSubmitted] = useState<{ email: string } | null>(null);
  // Livre anônimo: guarda o pedido criado; se o checkout falhar, o retry NÃO
  // re-posta /api/doacoes/ (reconsumiria o token Turnstile single-use).
  const [pedidoCriadoId, setPedidoCriadoId] = useState<string | null>(null);

  // Normaliza o modo "Livre" (rascunhos antigos podem não ter o campo).
  const valorLivreActive =
    draft.offering.valorLivreActive ?? draft.offering.valorLivre != null;
  const isPago = !draft.offering.gratuito;
  const valorLivreError =
    attemptedSubmit && valorLivreActive && !draft.offering.valorLivre
      ? "O valor mínimo é R$ 1,00."
      : null;

  useEffect(() => {
    const loadPlanos = async () => {
      try {
        setIsLoadingPlanos(true);
        setPlanosError(null);
        const data = await apiFetch<Plan[]>("/api/planos/");
        setPlanos(data);

        // Só semeia se o usuário ainda não escolheu nada.
        if (
          !draft.offering.gratuito &&
          !draft.offering.selectedPlanId &&
          !draft.offering.valorLivre
        ) {
          if (isAuthenticated) {
            // Autenticado: card Gratuito pré-selecionado.
            setDraft((prev) => ({
              ...prev,
              offering: {
                selectedPlanId: null,
                valorLivre: null,
                valorLivreActive: false,
                gratuito: true,
              },
            }));
          } else {
            // Anônimo: card "Livre" pré-selecionado em R$ 1,00.
            setDraft((prev) => ({
              ...prev,
              offering: {
                selectedPlanId: null,
                valorLivre: reaisToInt(VALOR_LIVRE_PADRAO_REAIS),
                valorLivreActive: true,
                gratuito: false,
              },
            }));
          }
        }
      } catch (err) {
        const error = err as PastoralApiError;
        setPlanosError(error.pastoralMessage);
      } finally {
        setIsLoadingPlanos(false);
      }
    };
    loadPlanos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadInstituicoes = async () => {
      try {
        setIsLoadingInstituicoes(true);
        const data = await apiFetch<Instituicao[]>("/api/instituicoes/");
        setInstituicoes(data);
      } catch {
        // Instituição é opcional: falha aqui não bloqueia o pedido.
        setInstituicoes([]);
      } finally {
        setIsLoadingInstituicoes(false);
      }
    };
    loadInstituicoes();
  }, []);

  const handleOfferingChange = (offering: OfferingState) => {
    // Interagiu com a oferta → limpa o aviso de submit.
    setAttemptedSubmit(false);
    setDraft((prev) => ({ ...prev, offering }));
  };

  // Valida a oferta escolhida. Retorna false (e ajusta o estado de erro) se
  // não estiver pronta pra enviar.
  const ofertaValida = (): boolean => {
    setAttemptedSubmit(true);
    if (valorLivreActive && !draft.offering.valorLivre) {
      return false; // aviso aparece no campo via valorLivreError
    }
    if (
      !draft.offering.gratuito &&
      !draft.offering.selectedPlanId &&
      !draft.offering.valorLivre
    ) {
      setSubmitError("Por favor, escolha uma oferta para continuar.");
      return false;
    }
    return true;
  };

  const valorCentavosDaOferta = (): number => {
    if (draft.offering.selectedPlanId) {
      const selectedPlan = planos.find(
        (p) => p.id === draft.offering.selectedPlanId,
      );
      return selectedPlan?.valor_centavos ?? 0;
    }
    return draft.offering.valorLivre ?? 0;
  };

  // ---- LOGADO: PrayerForm (customerFetch) ----
  const handleLoggedSubmit = async (formData: PedidoFormData) => {
    if (!ofertaValida()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // Gratuito: cria o pedido sem checkout.
    if (draft.offering.gratuito) {
      try {
        const { id } = await customerFetch<{ id: string }>(
          "/api/pedidos/gratuito/",
          {
            method: "POST",
            body: JSON.stringify({
              ...formData,
              canal_entrega: draft.canal.toLowerCase(),
            }),
            showToast: false,
          },
        );
        clearDraft();
        window.location.href = `/confirmacao?pedido_id=${id}`;
      } catch (err) {
        setSubmitError((err as PastoralApiError).pastoralMessage);
        setIsSubmitting(false);
      }
      return;
    }

    // Livre (pago): cria o pedido + gera o Pix.
    try {
      const payload: Record<string, unknown> = {
        ...formData,
        valor_centavos: valorCentavosDaOferta(),
        canal_entrega: draft.canal.toLowerCase(),
      };
      if (draft.offering.selectedPlanId) {
        payload.plano = draft.offering.selectedPlanId;
      }
      if (instituicaoId) {
        payload.instituicao = instituicaoId;
      }

      const { id } = await customerFetch<{ id: string }>("/api/pedidos/", {
        method: "POST",
        body: JSON.stringify(payload),
        showToast: false,
      });
      await customerFetch(`/api/pedidos/${id}/checkout/`, {
        method: "POST",
        showToast: false,
      });

      clearDraft();
      window.location.href = `/confirmacao?pedido_id=${id}`;
    } catch (err) {
      setSubmitError((err as PastoralApiError).pastoralMessage);
      setIsSubmitting(false);
    }
  };

  // ---- ANÔNIMO: PrayerFormGratuito (apiFetch + Turnstile/fingerprint) ----
  const handleAnonSubmit = async (data: PedidoGratuitoData) => {
    if (!ofertaValida()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // Gratuito anônimo: fluxo freemium double opt-in (mostra "confira e-mail").
    if (draft.offering.gratuito) {
      try {
        await criarPedidoGratuito(data);
        toast.success("Pedido recebido! Confira seu e-mail pra confirmar.");
        setSubmitted({ email: data.email });
      } catch (err) {
        const error = err as PastoralApiError;
        const msg =
          error?.pastoralMessage ??
          "Algo não saiu como o esperado. Tente novamente.";
        if (error?.code === "user_ja_possui_conta") {
          const redirect =
            (typeof error.extra?.redirect === "string" &&
              error.extra.redirect) ||
            "/login";
          navigate(redirect, { state: { flashMessage: msg, next: "/" } });
          return;
        }
        setSubmitError(msg);
        toast.error(msg);
        setIsSubmitting(false);
      }
      return;
    }

    // Livre anônimo (pago): cria a doação + gera o Pix.
    try {
      let pedidoId = pedidoCriadoId;
      if (!pedidoId) {
        const pedido = await criarDoacaoAnonima({
          ...data,
          valor_centavos: valorCentavosDaOferta(),
          instituicao: instituicaoId ?? undefined,
        });
        pedidoId = pedido.id;
        setPedidoCriadoId(pedidoId);
      }
      await gerarCheckout(pedidoId);
      clearDraft();
      window.location.href = `/confirmacao?pedido_id=${pedidoId}`;
    } catch (err) {
      setSubmitError((err as PastoralApiError).pastoralMessage);
      setIsSubmitting(false);
    }
  };

  const handleRetryLoadPlanos = () => {
    setPlanosError(null);
    setIsLoadingPlanos(true);
    apiFetch<Plan[]>("/api/planos/")
      .then((data) => {
        setPlanos(data);
      })
      .catch((err) => {
        setPlanosError((err as PastoralApiError).pastoralMessage);
      })
      .finally(() => {
        setIsLoadingPlanos(false);
      });
  };

  const eyebrowClass = isDark
    ? "font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-clama-gold-soft mb-4"
    : "font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-[#8a5cf6] mb-4";

  // Bloco de contribuição (oferta + instituição no modo pago) — compartilhado.
  const contribuicaoBlock = (
    <>
      <section>
        <div className={eyebrowClass}>Escolha sua contribuição</div>
        <OfferingCards
          planos={planos}
          selectedPlanId={draft.offering.selectedPlanId}
          valorLivre={draft.offering.valorLivre}
          valorLivreActive={valorLivreActive}
          gratuito={draft.offering.gratuito}
          allowGratuito
          onChange={handleOfferingChange}
          valorLivreError={valorLivreError}
          theme={theme}
        />
      </section>

      {isPago && (
        <>
          <Divider theme={theme} />
          <section>
            <div className={eyebrowClass}>
              Direcionar a uma instituição (opcional)
            </div>
            <InstituicaoSelect
              id="instituicao"
              instituicoes={instituicoes}
              value={instituicaoId}
              onChange={setInstituicaoId}
              isLoading={isLoadingInstituicoes}
            />
            <p
              className={
                isDark
                  ? "mt-2 font-sans text-xs leading-relaxed text-clama-cream/50"
                  : "mt-2 font-sans text-xs leading-relaxed text-[#888]"
              }
            >
              Uma parte da sua contribuição será direcionada a uma instituição
              de sua preferência.
            </p>
          </section>
        </>
      )}
    </>
  );

  const anonSubmitLabel = draft.offering.gratuito
    ? "Receber minha oração gratuita"
    : "Contribuir e receber minha oração";

  return (
    <section
      ref={ref}
      id="fazer-pedido"
      className={isDark ? "scroll-mt-20" : "bg-white scroll-mt-20"}
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

            {isLoadingPlanos && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <LoadingSpinner size={32} />
                <p
                  className={
                    isDark
                      ? "text-clama-cream/50 font-sans"
                      : "text-[#888] font-sans"
                  }
                >
                  Carregando...
                </p>
              </div>
            )}

            {planosError && !isLoadingPlanos && (
              <div className="py-8">
                <PastoralAlert variant="error">{planosError}</PastoralAlert>
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={handleRetryLoadPlanos}
                    className={
                      isDark
                        ? "border-clama-gold/40 text-clama-cream hover:bg-clama-gold/10"
                        : "border-clama-night/30 text-clama-night hover:bg-clama-cream"
                    }
                  >
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}

            {!isLoadingPlanos && !planosError && (
              <div className="space-y-6">
                {isAuthenticated ? (
                  // ---- LOGADO: dados → contribuição → botão externo ----
                  <>
                    <section>
                      <div className={eyebrowClass}>Seus dados</div>
                      <PrayerForm
                        planos={planos}
                        onSubmit={handleLoggedSubmit}
                        theme={theme}
                        prefill={prefill}
                      />
                    </section>

                    <Divider theme={theme} />

                    {contribuicaoBlock}

                    <section className="mt-8 mb-8">
                      <Button
                        type="submit"
                        form="prayer-form"
                        variant="gold"
                        size="lg"
                        disabled={
                          isSubmitting ||
                          (!draft.offering.gratuito &&
                            !draft.offering.selectedPlanId &&
                            !valorLivreActive)
                        }
                        className="w-full h-12 text-[1.05rem] font-bold rounded-full"
                      >
                        {isSubmitting ? (
                          <>
                            <LoadingSpinner size={20} className="mr-2" />
                            Enviando...
                          </>
                        ) : (
                          "Levar meu clamor"
                        )}
                      </Button>

                      <p
                        className={
                          isDark
                            ? "font-sans text-[0.75rem] text-clama-cream/45 text-center leading-relaxed mt-4"
                            : "font-sans text-[0.75rem] text-[#aaa] text-center leading-relaxed mt-4"
                        }
                      >
                        Seus dados são tratados com sigilo e respeito.
                        <br />
                        Jamais compartilhamos suas informações.
                      </p>
                    </section>
                  </>
                ) : (
                  // ---- ANÔNIMO: contribuição → dados (form c/ botão próprio) ----
                  <>
                    <header className="text-center mb-2">
                      <p
                        className={`font-sans text-[0.78rem] tracking-[2px] uppercase mb-2 ${isDark ? "text-clama-gold-soft" : "text-[#8a5cf6]"}`}
                      >
                        Oferecimento da casa
                      </p>
                      <h2
                        className={`font-serif text-[1.6rem] md:text-[1.9rem] leading-tight mb-3 ${isDark ? "text-clama-cream" : "text-clama-night"}`}
                      >
                        Faça seu pedido
                      </h2>
                      <p
                        className={`font-sans text-[0.95rem] leading-relaxed ${isDark ? "text-clama-cream/55" : "text-[#666]"}`}
                      >
                        Escolha entre receber sua oração gratuitamente ou
                        contribuir com o valor que o seu coração indicar — e, se
                        quiser, direcione parte a uma instituição parceira.
                      </p>
                    </header>

                    <section>
                      <div className={eyebrowClass}>Seus dados</div>
                      <PrayerFormGratuito
                        onSubmit={handleAnonSubmit}
                        isSubmitting={isSubmitting}
                        theme={theme}
                        showSubmitButton={false}
                      />
                    </section>

                    <Divider theme={theme} />

                    {contribuicaoBlock}

                    <section className="mt-8 mb-8">
                      <Button
                        type="submit"
                        form="prayer-form-gratuito"
                        variant="gold"
                        size="lg"
                        disabled={isSubmitting}
                        className="w-full h-12 text-[1.05rem] font-bold rounded-full"
                      >
                        {isSubmitting ? (
                          <>
                            <LoadingSpinner size={20} className="mr-2" />
                            Enviando...
                          </>
                        ) : (
                          anonSubmitLabel
                        )}
                      </Button>

                      <p
                        className={
                          isDark
                            ? "font-sans text-[0.75rem] text-clama-cream/45 text-center leading-relaxed mt-4"
                            : "font-sans text-[0.75rem] text-[#aaa] text-center leading-relaxed mt-4"
                        }
                      >
                        {draft.offering.gratuito
                          ? "Após enviar, confirme no e-mail que vamos te mandar."
                          : "Você será direcionado ao pagamento seguro via Pix."}
                        <br />
                        Seus dados são tratados com sigilo e respeito.
                      </p>
                    </section>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
  },
);

PedidoSection.displayName = "PedidoSection";

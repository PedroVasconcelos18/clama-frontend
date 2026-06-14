import { forwardRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { apiFetch, PastoralApiError } from "@/lib/api";
import { reaisToInt } from "@/lib/formatters";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useCustomerApi } from "@/hooks/useCustomerApi";
import { type Plan } from "@/types/plano.types";
import { type PedidoFormData } from "@/lib/schemas/pedido";

import { PrayerForm } from "@/components/clama/PrayerForm";
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
  offering: { selectedPlanId: null, valorLivre: null, gratuito: false },
  canal: "EMAIL",
};

// Valor livre pré-selecionado por padrão (deve casar com o mínimo do
// OfferingCards / da API).
const VALOR_LIVRE_PADRAO_REAIS = 5.99;

export interface PedidoSectionProps {
  /**
   * "light" (default) = visual original, usado na Landing Page — NÃO mexer.
   * "dark" = variante pro tema escuro da /conta (conta-design).
   */
  theme?: "light" | "dark";
}

export const PedidoSection = forwardRef<HTMLElement, PedidoSectionProps>(
  ({ theme = "light" }, ref) => {
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { isAuthenticated, user } = useCustomerAuth();
  const { customerFetch } = useCustomerApi();

  // Cliente logado: semeia "Seus dados" com o cadastro dele (editável).
  // Anônimo (LP/gratuito): sem prefill — fluxo original intacto.
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
            // Autenticado: o card Gratuito está disponível e vem
            // pré-selecionado.
            setDraft((prev) => ({
              ...prev,
              offering: {
                selectedPlanId: null,
                valorLivre: null,
                gratuito: true,
              },
            }));
          } else {
            // Anônimo: card "Livre" pré-selecionado em R$ 5,99 (sem
            // destacar nenhum plano).
            setDraft((prev) => ({
              ...prev,
              offering: {
                selectedPlanId: null,
                valorLivre: reaisToInt(VALOR_LIVRE_PADRAO_REAIS),
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

  const handleOfferingChange = (offering: OfferingState) => {
    setDraft((prev) => ({ ...prev, offering }));
  };

  // Comentado junto com o bloco "Receber oração por". Reativar com o
  // ChannelToggle quando o WhatsApp voltar.
  // const handleCanalChange = (canal: CanalEntrega) => {
  //   setDraft((prev) => ({ ...prev, canal }));
  // };

  const handleFormSubmit = async (formData: PedidoFormData) => {
    // Paywall: anônimos vão pra /login antes de criar pedido pago
    if (!isAuthenticated) {
      navigate("/login?next=/#pedido");
      return;
    }

    if (
      !draft.offering.gratuito &&
      !draft.offering.selectedPlanId &&
      !draft.offering.valorLivre
    ) {
      setSubmitError("Por favor, escolha uma oferta para continuar.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // Fluxo gratuito: cria o pedido sem checkout e dispara a geração.
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
        const error = err as PastoralApiError;
        setSubmitError(error.pastoralMessage);
        setIsSubmitting(false);
      }
      return;
    }

    try {
      let valor_centavos: number;
      if (draft.offering.selectedPlanId) {
        const selectedPlan = planos.find((p) => p.id === draft.offering.selectedPlanId);
        valor_centavos = selectedPlan?.valor_centavos ?? 0;
      } else {
        valor_centavos = draft.offering.valorLivre ?? 0;
      }

      const payload: Record<string, unknown> = {
        ...formData,
        valor_centavos,
        canal_entrega: draft.canal.toLowerCase(),
      };
      if (draft.offering.selectedPlanId) {
        payload.plano = draft.offering.selectedPlanId;
      }

      const { id } = await customerFetch<{ id: string }>("/api/pedidos/", {
        method: "POST",
        body: JSON.stringify(payload),
        showToast: false,
      });

      const { checkout_url } = await customerFetch<{ checkout_url: string }>(
        `/api/pedidos/${id}/checkout/`,
        { method: "POST", showToast: false },
      );

      clearDraft();
      window.open(checkout_url, "_blank", "noopener,noreferrer");
      window.location.href = `/confirmacao?pedido_id=${id}`;
    } catch (err) {
      const error = err as PastoralApiError;
      setSubmitError(error.pastoralMessage);
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
        const error = err as PastoralApiError;
        setPlanosError(error.pastoralMessage);
      })
      .finally(() => {
        setIsLoadingPlanos(false);
      });
  };

  const eyebrowClass = isDark
    ? "font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-clama-gold-soft mb-4"
    : "font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-[#8a5cf6] mb-4";

  return (
    <section
      ref={ref}
      id="fazer-pedido"
      className={isDark ? "scroll-mt-20" : "bg-white scroll-mt-20"}
    >
      <div className="max-w-[580px] mx-auto px-6 py-8">
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
            <section>
              <div className={eyebrowClass}>Seus dados</div>
              <PrayerForm
                planos={planos}
                onSubmit={handleFormSubmit}
                theme={theme}
                prefill={prefill}
              />
            </section>

            <Divider theme={theme} />

            {/*
              "Receber oração por" comentado: hoje só temos e-mail. O canal
              fica fixo em "EMAIL" (default do INITIAL_DRAFT). Reativar este
              bloco quando o WhatsApp voltar.
            */}
            {/*
            <section>
              <div className={eyebrowClass}>Receber oração por</div>
              <ChannelToggle
                value={draft.canal}
                onChange={handleCanalChange}
                theme={theme}
              />
            </section>

            <Divider theme={theme} />
            */}

            <section>
              <div className={eyebrowClass}>Escolha sua contribuição</div>
              <OfferingCards
                planos={planos}
                selectedPlanId={draft.offering.selectedPlanId}
                valorLivre={draft.offering.valorLivre}
                gratuito={draft.offering.gratuito}
                allowGratuito={isAuthenticated}
                onChange={handleOfferingChange}
                theme={theme}
              />
            </section>

            <section className="mt-8 mb-8">
              {isAuthenticated ? (
                <Button
                  type="submit"
                  form="prayer-form"
                  variant="gold"
                  size="lg"
                  disabled={
                    isSubmitting ||
                    (!draft.offering.gratuito &&
                      !draft.offering.selectedPlanId &&
                      !draft.offering.valorLivre)
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
              ) : (
                <Button
                  type="button"
                  variant="gold"
                  size="lg"
                  onClick={() => navigate("/login?next=/#pedido")}
                  className="w-full h-12 text-[1.05rem] font-bold rounded-full"
                >
                  Entrar para fazer pedido
                </Button>
              )}

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
          </div>
        )}
      </div>
    </section>
  );
  },
);

PedidoSection.displayName = "PedidoSection";

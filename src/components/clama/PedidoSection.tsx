import { forwardRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { apiFetch, PastoralApiError } from "@/lib/api";
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
import {
  ChannelToggle,
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
  offering: { selectedPlanId: null, valorLivre: null },
  canal: "EMAIL",
};

export const PedidoSection = forwardRef<HTMLElement>((_props, ref) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useCustomerAuth();
  const { customerFetch } = useCustomerApi();

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
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    const loadPlanos = async () => {
      try {
        setIsLoadingPlanos(true);
        setPlanosError(null);
        const data = await apiFetch<Plan[]>("/api/planos/");
        setPlanos(data);

        if (!draft.offering.selectedPlanId && !draft.offering.valorLivre) {
          const recommendedPlan = data.find((p) => p.ordem === 2);
          if (recommendedPlan) {
            setDraft((prev) => ({
              ...prev,
              offering: { selectedPlanId: recommendedPlan.id, valorLivre: null },
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

  const handleCanalChange = (canal: CanalEntrega) => {
    setDraft((prev) => ({ ...prev, canal }));
  };

  const handleFormSubmit = async (formData: PedidoFormData) => {
    // Paywall: anônimos vão pra /login antes de criar pedido pago
    if (!isAuthenticated) {
      navigate("/login?next=/#pedido");
      return;
    }

    if (!draft.offering.selectedPlanId && !draft.offering.valorLivre) {
      setSubmitError("Por favor, escolha uma oferta para continuar.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

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

  return (
    <section
      ref={ref}
      id="fazer-pedido"
      className="bg-white scroll-mt-20"
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
            <p className="text-[#888] font-sans">Carregando...</p>
          </div>
        )}

        {planosError && !isLoadingPlanos && (
          <div className="py-8">
            <PastoralAlert variant="error">{planosError}</PastoralAlert>
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={handleRetryLoadPlanos}
                className="border-clama-night/30 text-clama-night hover:bg-clama-cream"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {!isLoadingPlanos && !planosError && (
          <div className="space-y-6">
            <section>
              <div className="font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-[#8a5cf6] mb-4">
                Seus dados
              </div>
              <PrayerForm
                planos={planos}
                onSubmit={handleFormSubmit}
                onValidityChange={setIsFormValid}
              />
            </section>

            <Divider />

            <section>
              <div className="font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-[#8a5cf6] mb-4">
                Receber oração por
              </div>
              <ChannelToggle value={draft.canal} onChange={handleCanalChange} />
            </section>

            <Divider />

            <section>
              <div className="font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-[#8a5cf6] mb-4">
                Escolha sua contribuição
              </div>
              <OfferingCards
                planos={planos}
                selectedPlanId={draft.offering.selectedPlanId}
                valorLivre={draft.offering.valorLivre}
                onChange={handleOfferingChange}
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
                    !isFormValid ||
                    (!draft.offering.selectedPlanId && !draft.offering.valorLivre)
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

              <p className="font-sans text-[0.75rem] text-[#aaa] text-center leading-relaxed mt-4">
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
});

PedidoSection.displayName = "PedidoSection";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { apiFetch, PastoralApiError } from "@/lib/api";
import { useFormDraft } from "@/hooks/useFormDraft";
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
import { StickyNav } from "@/components/clama/StickyNav";
import { Footer } from "@/components/clama/Footer";
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

export default function FazerPedido() {
  // Planos state
  const [planos, setPlanos] = useState<Plan[]>([]);
  const [isLoadingPlanos, setIsLoadingPlanos] = useState(true);
  const [planosError, setPlanosError] = useState<string | null>(null);

  // Form draft
  const handleDraftSaved = useCallback(() => {
    toast.info("Seu rascunho está seguro.", { duration: 2500 });
  }, []);

  const { value: draft, setValue: setDraft, clearDraft } = useFormDraft<FormDraftState>(
    "clama:form-draft",
    INITIAL_DRAFT,
    handleDraftSaved
  );

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);

  // Load planos on mount
  useEffect(() => {
    const loadPlanos = async () => {
      try {
        setIsLoadingPlanos(true);
        setPlanosError(null);
        const data = await apiFetch<Plan[]>("/api/planos/");
        setPlanos(data);

        // Auto-select recommended plan (ordem=2) if nothing selected
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
  }, []);

  const handleOfferingChange = (offering: OfferingState) => {
    setDraft((prev) => ({ ...prev, offering }));
  };

  const handleCanalChange = (canal: CanalEntrega) => {
    setDraft((prev) => ({ ...prev, canal }));
  };

  const handleFormSubmit = async (formData: PedidoFormData) => {
    // Validate offering selection
    if (!draft.offering.selectedPlanId && !draft.offering.valorLivre) {
      setSubmitError("Por favor, escolha uma oferta para continuar.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Determine valor_centavos
      let valor_centavos: number;
      if (draft.offering.selectedPlanId) {
        const selectedPlan = planos.find((p) => p.id === draft.offering.selectedPlanId);
        valor_centavos = selectedPlan?.valor_centavos ?? 0;
      } else {
        valor_centavos = draft.offering.valorLivre ?? 0;
      }

      // Step 1: Create pedido — omite "plano" no Valor Livre (backend infere).
      const payload: Record<string, unknown> = {
        ...formData,
        valor_centavos,
        canal_entrega: draft.canal.toLowerCase(),
      };
      if (draft.offering.selectedPlanId) {
        payload.plano = draft.offering.selectedPlanId;
      }

      const { id } = await apiFetch<{ id: string }>("/api/pedidos/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Step 2: Create checkout
      const { checkout_url } = await apiFetch<{ checkout_url: string }>(
        `/api/pedidos/${id}/checkout/`,
        { method: "POST" }
      );

      // Step 3: Clear draft, open payment in new tab, redirect to confirmation
      clearDraft();

      // Abre pagamento em nova aba
      window.open(checkout_url, "_blank", "noopener,noreferrer");

      // Redireciona página atual para confirmação (aguardando pagamento)
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
    <div className="min-h-screen bg-white">
      <StickyNav />

      <main className="max-w-[580px] mx-auto px-6 py-8">
        {/* Form Header */}
        <div className="text-center mb-8">
          <h2 className="font-serif text-clama-night text-[1.6rem] mb-1">
            Leve seu clamor
          </h2>
          <p className="font-sans text-[#888] text-[0.88rem]">
            Preencha seus dados para receber uma oração personalizada, com cuidado e fundamento bíblico.
          </p>
        </div>

        {/* Submit Error Alert */}
        {submitError && (
          <div className="mb-6">
            <PastoralAlert variant="error">{submitError}</PastoralAlert>
          </div>
        )}

        {/* Loading State */}
        {isLoadingPlanos && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <LoadingSpinner size={32} />
            <p className="text-[#888] font-sans">Carregando...</p>
          </div>
        )}

        {/* Error State */}
        {planosError && !isLoadingPlanos && (
          <div className="py-8">
            <PastoralAlert variant="error">
              {planosError}
            </PastoralAlert>
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

        {/* Main Content */}
        {!isLoadingPlanos && !planosError && (
          <div className="space-y-6">
            {/* Section: Seus dados */}
            <section>
              <div className="font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-[#8a5cf6] mb-4">
                Seus dados
              </div>

              <PrayerForm
                planos={planos}
                onSubmit={handleFormSubmit}
                requireTelefone={draft.canal === "WHATSAPP"}
                onValidityChange={setIsFormValid}
              />
            </section>

            <Divider />

            {/* Section: Canal de entrega */}
            <section>
              <div className="font-sans text-[0.72rem] font-bold tracking-[2px] uppercase text-[#8a5cf6] mb-4">
                Receber oração por
              </div>

              <ChannelToggle
                value={draft.canal}
                onChange={handleCanalChange}
              />
            </section>

            <Divider />

            {/* Section: Contribuição */}
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

            {/* Submit Button & Privacy Note */}
            <section className="mt-8 mb-8">
              <Button
                type="submit"
                form="prayer-form"
                variant="gold"
                size="lg"
                disabled={isSubmitting || !isFormValid || (!draft.offering.selectedPlanId && !draft.offering.valorLivre)}
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

              <p className="font-sans text-[0.75rem] text-[#aaa] text-center leading-relaxed mt-4">
                Seus dados são tratados com sigilo e respeito.
                <br />
                Jamais compartilhamos suas informações.
              </p>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

import { forwardRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { apiFetch, PastoralApiError } from "@/lib/api";
import { reaisToInt } from "@/lib/formatters";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useSessao } from "@/contexts/SessaoContext";
import { useApi } from "@/hooks/useApi";
import { criarPedidoGratuito } from "@/lib/api/freemium";
import { corpoDoPedido, criarDoacaoAnonima } from "@/lib/api/doacoes";
import { type Plan } from "@/types/plano.types";
import { type Instituicao } from "@/types/instituicao.types";
import { type PedidoFormData } from "@/lib/schemas/pedido";
import { type PedidoGratuitoData } from "@/lib/schemas/pedido-gratuito";
import type { PedidoCriado, StatusPublico } from "@/types/pedido-status.types";

import { PrayerForm } from "@/components/clama/PrayerForm";
import { PrayerFormGratuito } from "@/components/clama/PrayerFormGratuito";
import { SubmittedView } from "@/components/clama/PedidoSectionGratuito";
import { InstituicaoSelect } from "@/components/clama/InstituicaoSelect";
import {
  OfferingCards,
  type OfferingState,
} from "@/components/clama/OfferingCards";
import { Divider } from "@/components/utility/Divider";
import PastoralAlert from "@/components/utility/PastoralAlert";
import LoadingSpinner from "@/components/utility/LoadingSpinner";
import { Button } from "@/components/ui/button";

interface FormDraftState {
  formData: Partial<PedidoFormData>;
  offering: OfferingState;
  /**
   * Pedido pago já criado. Sem dado pessoal: a assinatura é o SHA-256 do conteúdo
   * enviado (dados, valor, plano, instituição e dono). Um novo envio idêntico,
   * em até 24 h, reusa o pedido em vez de recriá-lo.
   */
  pedido?: { id: string; assinatura: string; criadoEm: number } | null;
}

// Versão 2: ids de plano passaram de UUID (string) para number (onda 3).
const DRAFT_VERSAO = 2;

const INITIAL_DRAFT: FormDraftState = {
  formData: {},
  offering: {
    selectedPlanId: null,
    valorLivre: null,
    valorLivreActive: false,
    gratuito: false,
  },
  pedido: null,
};

// Mesmo prazo do Pix (D16): depois disso o envio cria outro pedido.
const REUSO_MS = 24 * 60 * 60 * 1000;

/** SHA-256 em hex do conteúdo (sem PII em claro no rascunho); sem `crypto.subtle`, não há reuso. */
async function assinaturaDe(conteudo: unknown): Promise<string> {
  if (!globalThis.crypto?.subtle) return "";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(conteudo)));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

// 400 `dados_invalidos` traz a explicação em `erros` (a pastoral é genérica).
const mensagemDoErro = (err: unknown) => {
  const e = err as PastoralApiError;
  const campos = Object.values(e.campos ?? {});
  return campos.length ? campos.join(" ") : e.pastoralMessage;
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
 *  |            | Gratuito                       | Livre (pago)                 |
 *  |------------|--------------------------------|------------------------------|
 *  | Logado     | POST /api/pedidos/gratuito     | POST /api/pedidos            |
 *  | Anônimo    | POST /api/freemium/pedidos/    | POST /api/doacoes            |
 *
 * O pago guarda o id criado (estado + rascunho, com a assinatura do conteúdo e
 * sem dado pessoal) e vai para a confirmação, que pede o Pix. Um novo envio
 * idêntico, em até 24 h e com o pedido ainda aguardando pagamento, volta para a
 * confirmação dele em vez de criar outro.
 *
 * Anônimo usa o `PrayerFormGratuito` (Turnstile invisível + fingerprint +
 * consent). O grátis anônimo é double opt-in por e-mail (mostra `SubmittedView`).
 */
export const PedidoSection = forwardRef<HTMLElement, PedidoSectionProps>(
  ({ theme = "light" }, ref) => {
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { usuario } = useSessao();
  const isAuthenticated = !!usuario;
  const { fetchApi } = useApi();

  // Cliente logado: semeia "Seus dados" com o cadastro dele (editável).
  // Anônimo: sem prefill.
  const prefill =
    usuario
      ? {
          nome: usuario.nomeCompleto || "",
          email: usuario.email || "",
          // CPF, telefone, idade e sexo voltam com a cifra (ondas 4 e 5).
          cpf_cnpj: "",
          telefone: "",
          idade: null,
          sexo: "",
        }
      : undefined;

  const [planos, setPlanos] = useState<Plan[]>([]);
  const [isLoadingPlanos, setIsLoadingPlanos] = useState(true);
  const [planosError, setPlanosError] = useState<string | null>(null);

  // Instituição é opcional e não deve travar o fluxo do pedido: uma falha ao
  // carregar apenas deixa o dropdown vazio (só "Sem instituição").
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [isLoadingInstituicoes, setIsLoadingInstituicoes] = useState(true);
  const [instituicaoId, setInstituicaoId] = useState<number | null>(null);

  const handleDraftSaved = useCallback(() => {
    toast.info("Seu rascunho está seguro.", { duration: 2500 });
  }, []);

  const { value: draft, setValue: setDraft, clearDraft, salvarAgora } = useFormDraft<FormDraftState>(
    "clama:form-draft",
    INITIAL_DRAFT,
    handleDraftSaved,
    800,
    {
      versao: DRAFT_VERSAO,
      // Id de plano agora é number; rascunho com UUID antigo é descartado.
      valido: (d) => {
        const id = d.offering?.selectedPlanId;
        return id === null || id === undefined || typeof id === "number";
      },
    },
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Só vira true ao tentar enviar — usado pra exibir o aviso do valor livre.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  // Grátis anônimo: guarda o e-mail pra tela "Confira seu e-mail".
  const [submitted, setSubmitted] = useState<{ email: string } | null>(null);

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
        const data = await apiFetch<Plan[]>("/api/planos");
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
        const data = await apiFetch<Instituicao[]>("/api/instituicoes");
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
      return selectedPlan?.valorCentavos ?? 0;
    }
    return draft.offering.valorLivre ?? 0;
  };

  const irParaConfirmacao = (id: string) => navigate(`/confirmacao?pedido_id=${id}`);

  // Pedido pago com exatamente o mesmo conteúdo, criado há menos de 24 h e ainda aguardando
  // pagamento: reusa. Qualquer diferença, já pago ou sumido: cria outro. Falha de rede sobe.
  const pedidoReaproveitavel = async (assinatura: string): Promise<string | null> => {
    const salvo = draft.pedido;
    if (!salvo || !assinatura || salvo.assinatura !== assinatura) return null;
    if (!(Date.now() - salvo.criadoEm < REUSO_MS)) return null;
    try {
      const atual = await apiFetch<StatusPublico>(`/api/pedidos/${salvo.id}`, { showToast: false });
      return atual.status === "AGUARDANDO_PAGAMENTO" ? salvo.id : null;
    } catch (err) {
      if ((err as PastoralApiError).httpStatus === 404) return null;
      throw err;
    }
  };

  // Pago (logado ou anônimo): reusa ou cria e vai à confirmação. O rascunho fica só com a
  // oferta e {id, assinatura, criadoEm}: nada de CPF ou nome no localStorage.
  const enviarPago = async (conteudo: object, criar: () => Promise<PedidoCriado>) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const assinatura = await assinaturaDe({ conteudo, usuarioId: usuario?.id ?? null });
      let id = await pedidoReaproveitavel(assinatura);
      if (!id) {
        id = (await criar()).id!;
        salvarAgora({ ...draft, formData: {}, pedido: { id, assinatura, criadoEm: Date.now() } });
      }
      irParaConfirmacao(id);
    } catch (err) {
      setSubmitError(mensagemDoErro(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- LOGADO: PrayerForm (fetchApi) ----
  const handleLoggedSubmit = async (formData: PedidoFormData) => {
    if (!ofertaValida()) return;

    // Gratuito: cria o pedido sem cobrança; a confirmação mostra "gerando".
    if (draft.offering.gratuito) {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const { id } = await fetchApi<PedidoCriado>("/api/pedidos/gratuito", {
          method: "POST",
          body: JSON.stringify(corpoDoPedido(formData)),
          showToast: false,
        });
        clearDraft();
        irParaConfirmacao(id!);
      } catch (err) {
        setSubmitError(mensagemDoErro(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const corpo = {
      ...corpoDoPedido(formData),
      valorCentavos: valorCentavosDaOferta(),
      plano: draft.offering.selectedPlanId ?? undefined,
      instituicao: instituicaoId ?? undefined,
    };
    await enviarPago(corpo, () =>
      fetchApi<PedidoCriado>("/api/pedidos", { method: "POST", body: JSON.stringify(corpo), showToast: false }),
    );
  };

  // ---- ANÔNIMO: PrayerFormGratuito (apiFetch + Turnstile/fingerprint) ----
  const handleAnonSubmit = async (data: PedidoGratuitoData) => {
    if (!ofertaValida()) return;

    // Gratuito anônimo: fluxo freemium double opt-in (onda 5; mostra "confira e-mail").
    if (draft.offering.gratuito) {
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

    // Livre anônimo (pago): reusar evita gastar de novo o token do Turnstile.
    const valor = valorCentavosDaOferta();
    await enviarPago(
      { ...corpoDoPedido(data), valorCentavos: valor, instituicao: instituicaoId ?? undefined },
      () => criarDoacaoAnonima(data, valor, instituicaoId),
    );
  };

  const handleRetryLoadPlanos = () => {
    setPlanosError(null);
    setIsLoadingPlanos(true);
    apiFetch<Plan[]>("/api/planos")
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

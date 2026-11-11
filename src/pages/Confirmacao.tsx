import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiFetch, PastoralApiError } from "@/lib/api";
import { formatarDataHora } from "@/lib/datetime";
import type { PixDoPedido, StatusPedido, StatusPublico } from "@/types/pedido-status.types";
import {
  MSG_CONFIRMACAO_EMAIL,
  MSG_GERANDO_ORACAO,
  MSG_ORACAO_ENVIADA_EMAIL,
  MSG_REAGENDADO,
  MSG_ERRO_DEFINITIVO,
} from "@/lib/pastoral_messages";

import { StickyNav } from "@/components/clama/StickyNav";
import { Footer } from "@/components/clama/Footer";
import { WhatsAppShareButton } from "@/components/clama/WhatsAppShareButton";
import PastoralAlert from "@/components/utility/PastoralAlert";
import LoadingSpinner from "@/components/utility/LoadingSpinner";

const POLL_INTERVAL_MS = 5000;
// ~15 min: enquanto aguarda o pagamento Pix e a oração, seguimos consultando o status.
const MAX_POLL_ATTEMPTS = 180;
const TERMINAIS: (StatusPedido | undefined)[] = ["ENVIADA", "ERRO"];
const MAX_INTERVALO_MS = 60_000;
const FALHAS_PARA_AVISAR = 3;

interface StatusInfo {
  title: string;
  message: string;
  isComplete: boolean;
  isError: boolean;
  isWaiting: boolean;
}

function getStatusMessage(status: StatusPedido | undefined, pastoralMessage?: string | null): StatusInfo {
  switch (status) {
    case "AGUARDANDO_PAGAMENTO":
      return {
        title: "Quase lá — pague com Pix",
        message:
          "Escaneie o QR code ou copie o código Pix abaixo. Assim que o pagamento cair, sua oração começa a ser preparada — esta tela atualiza sozinha.",
        isComplete: false,
        isError: false,
        isWaiting: false,
      };
    case "PAGO":
    case "GERANDO_ORACAO":
    case "ORACAO_GERADA":
      return {
        title: "Seu clamor foi recebido",
        message: MSG_CONFIRMACAO_EMAIL,
        isComplete: false,
        isError: false,
        isWaiting: false,
      };
    case "ENVIADA":
      return {
        title: "Sua oração já está aí!",
        message: MSG_ORACAO_ENVIADA_EMAIL,
        isComplete: true,
        isError: false,
        isWaiting: false,
      };
    case "AGUARDANDO_NOVA_TENTATIVA":
      return {
        title: "Aguardando...",
        message: MSG_REAGENDADO,
        isComplete: false,
        isError: false,
        isWaiting: true,
      };
    case "ERRO":
      return {
        title: "Tivemos um soluço",
        message: pastoralMessage || MSG_ERRO_DEFINITIVO,
        isComplete: false,
        isError: true,
        isWaiting: false,
      };
    default:
      return {
        title: "Seu clamor foi recebido",
        message: MSG_GERANDO_ORACAO,
        isComplete: false,
        isError: false,
        isWaiting: false,
      };
  }
}

/**
 * Status do pedido (`GET /api/pedidos/{id}` a cada 5 s). Em `AGUARDANDO_PAGAMENTO`
 * pede o Pix (`POST /api/pedidos/{id}/pix`, idempotente: devolve a cobrança vigente
 * ou recria a vencida). Tentar de novo só repete o Pix: o pedido nunca é recriado.
 */
export default function Confirmacao() {
  const [searchParams] = useSearchParams();
  const pedidoId = searchParams.get("pedido_id");

  const [pedido, setPedido] = useState<StatusPublico | null>(null);
  const [pix, setPix] = useState<PixDoPedido | null>(null);
  const [erroPix, setErroPix] = useState<string | null>(null);
  const [gerandoPix, setGerandoPix] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [error, setError] = useState<string | null>(
    pedidoId ? null : "Pedido não encontrado. Retorne à página inicial e tente novamente.",
  );

  const [aviso, setAviso] = useState<string | null>(null);
  // Erro definitivo (sem id, 404) ou, antes do primeiro status, falhas seguidas.
  const erroNaTela = error ?? (pedido ? null : aviso);

  const status = pedido?.status;
  const oracaoGerada = pedido?.oracaoGerada ?? "";
  const pixQrCode = pix?.copiaECola ?? null;
  const isLoading = !pedido && !erroNaTela;

  const copiarPix = async () => {
    if (!pixQrCode) return;
    try {
      await navigator.clipboard.writeText(pixQrCode);
      setPixCopiado(true);
      window.setTimeout(() => setPixCopiado(false), 2500);
    } catch {
      // Clipboard indisponível (http/permite): silencioso — o usuário ainda
      // pode selecionar o código manualmente.
    }
  };

  const pedirPix = useCallback(async () => {
    setErroPix(null);
    setGerandoPix(true);
    try {
      setPix(await apiFetch<PixDoPedido>(`/api/pedidos/${pedidoId}/pix`, { method: "POST", showToast: false }));
    } catch (err) {
      // Já pago (409 pedido_ja_pago): o polling mostra o status novo.
      if ((err as PastoralApiError).code !== "pedido_ja_pago") {
        setErroPix((err as PastoralApiError).pastoralMessage);
      }
    } finally {
      setGerandoPix(false);
    }
  }, [pedidoId]);

  // A cobrança vence com a tela aberta: o status público não informa, então comparamos o `expiraEm` do Pix com o relógio.
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    if (!pix?.expiraEm) return
    const t = window.setInterval(() => setAgora(Date.now()), 15_000)
    return () => window.clearInterval(t)
  }, [pix?.expiraEm])
  const pixVencido = !!pix?.expiraEm && new Date(pix.expiraEm).getTime() <= agora

  // Pede o Pix uma vez, quando o status chega em AGUARDANDO_PAGAMENTO.
  const pixPedido = useRef(false);
  useEffect(() => {
    if (status !== "AGUARDANDO_PAGAMENTO" || pixPedido.current) return;
    pixPedido.current = true;
    void pedirPix();
  }, [status, pedirPix]);

  // Polling com backoff: 5 s enquanto responde; cada falha dobra o intervalo (teto de 60 s)
  // e o 429 vai direto ao teto. Sem nenhum status ainda, 3 falhas seguidas viram aviso na tela
  // (a consulta continua e o aviso some quando o status chega).
  useEffect(() => {
    if (!pedidoId) return;
    let ativo = true;
    let attempts = 0;
    let falhas = 0;
    let temStatus = false;
    let intervalo = POLL_INTERVAL_MS;
    let timer: number | undefined;

    const poll = async () => {
      attempts += 1;
      try {
        const data = await apiFetch<StatusPublico>(`/api/pedidos/${pedidoId}`, { showToast: false });
        if (!ativo) return;
        setPedido(data);
        setAviso(null);
        temStatus = true;
        falhas = 0;
        intervalo = POLL_INTERVAL_MS;
        if (TERMINAIS.includes(data.status)) return;
      } catch (err) {
        if (!ativo) return;
        const e = err as PastoralApiError;
        if (e.httpStatus === 404) {
          setError(e.pastoralMessage);
          return;
        }
        falhas += 1;
        intervalo = e.httpStatus === 429 ? MAX_INTERVALO_MS : Math.min(intervalo * 2, MAX_INTERVALO_MS);
        if (!temStatus && falhas >= FALHAS_PARA_AVISAR) setAviso(e.pastoralMessage);
      }
      if (ativo && attempts < MAX_POLL_ATTEMPTS) timer = window.setTimeout(poll, intervalo);
    };

    void poll();
    return () => {
      ativo = false;
      window.clearTimeout(timer);
    };
  }, [pedidoId]);

  const statusInfo = getStatusMessage(status, pedido?.mensagemPastoral);

  return (
    <div className="min-h-screen bg-white">
      <StickyNav />

      <main className="max-w-[480px] mx-auto px-6 py-12 text-center">
        {erroNaTela && (
          <div className="mb-8">
            <PastoralAlert variant="error">{erroNaTela}</PastoralAlert>
            <div className="mt-6">
              <Link to="/">
                <button className="bg-white text-clama-night border-[1.5px] border-clama-night py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-[#f9f5ff] transition-colors">
                  Voltar para o início
                </button>
              </Link>
            </div>
          </div>
        )}

        {!erroNaTela && (
          <>
            {/* Icon */}
            <div className="w-20 h-20 bg-[#fffbee] border-[3px] border-clama-gold rounded-full flex items-center justify-center mx-auto mb-6">
              {isLoading ? (
                <LoadingSpinner size={32} />
              ) : statusInfo.isError ? (
                <span className="text-[2rem]" role="img" aria-label="Atenção">
                  😔
                </span>
              ) : statusInfo.isWaiting ? (
                <span className="text-[2rem]" role="img" aria-label="Aguardando">
                  ⏳
                </span>
              ) : (
                <span className="text-[2rem]" role="img" aria-label="Oração">
                  🙏
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-[1.7rem] text-clama-night mb-3">
              {statusInfo.title}
            </h1>

            {/* Message */}
            {statusInfo.isError ? (
              <div className="mb-8">
                <PastoralAlert variant="error">{statusInfo.message}</PastoralAlert>
              </div>
            ) : statusInfo.isWaiting ? (
              <div className="mb-8">
                <PastoralAlert variant="info">{statusInfo.message}</PastoralAlert>
              </div>
            ) : (
              <p className="font-sans text-[#666] text-[0.95rem] leading-relaxed mb-8">
                {statusInfo.message}
                {!statusInfo.isComplete && (
                  <>
                    {" "}Enquanto aguarda, respire e se coloque em silêncio.
                  </>
                )}
              </p>
            )}

            {/* Pix — QR + copia-e-cola enquanto aguardando o pagamento */}
            {status === "AGUARDANDO_PAGAMENTO" && pixQrCode && (
              <div className="border-[1.5px] border-clama-gold/50 rounded-xl p-6 bg-[#fffbee] mb-8">
                {pix?.qrBase64 && (
                  <img
                    src={`data:image/png;base64,${pix.qrBase64}`}
                    alt="QR code Pix para pagamento"
                    className="w-52 h-52 mx-auto mb-4 rounded-lg bg-white p-2"
                  />
                )}
                <p className="font-sans text-[#666] text-[0.8rem] mb-2">
                  Ou copie o código Pix (copia e cola):
                </p>
                <div className="flex items-stretch gap-2">
                  <code className="flex-1 min-w-0 truncate text-left font-mono text-[0.75rem] text-clama-night bg-white border border-[#e0d8f0] rounded-lg px-3 py-2">
                    {pixQrCode}
                  </code>
                  <button
                    type="button"
                    onClick={copiarPix}
                    className="shrink-0 bg-clama-night text-white text-[0.8rem] font-semibold font-sans rounded-lg px-4 hover:bg-clama-night/90 transition-colors"
                  >
                    {pixCopiado ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <p className="font-sans text-[#aaa] text-[0.72rem] mt-3">
                  Pague no app do seu banco. A confirmação é automática — esta
                  tela avança sozinha.
                  {pix?.expiraEm && <> Este Pix vale até {formatarDataHora(pix.expiraEm)}.</>}
                </p>
                {pixVencido && (
                  <div className="mt-4">
                    <p className="font-sans text-[#666] text-[0.8rem] mb-2">Este Pix venceu. Gere um novo para pagar.</p>
                    <button
                      type="button"
                      onClick={() => void pedirPix()}
                      disabled={gerandoPix}
                      className="bg-clama-night text-white py-[0.7rem] px-6 text-[0.9rem] font-semibold font-sans rounded-full hover:bg-clama-night/90 transition-colors disabled:opacity-60"
                    >
                      Gerar novo Pix
                    </button>
                  </div>
                )}
              </div>
            )}

            {status === "AGUARDANDO_PAGAMENTO" && !pixQrCode && (
              <div className="mb-8">
                {erroPix ? (
                  <>
                    <PastoralAlert variant="error">{erroPix}</PastoralAlert>
                    <button
                      type="button"
                      onClick={() => void pedirPix()}
                      disabled={gerandoPix}
                      className="mt-4 bg-clama-night text-white py-[0.7rem] px-6 text-[0.9rem] font-semibold font-sans rounded-full hover:bg-clama-night/90 transition-colors disabled:opacity-60"
                    >
                      Tentar de novo
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-[#888] text-sm">
                    <LoadingSpinner size={16} />
                    <span>Gerando seu Pix...</span>
                  </div>
                )}
              </div>
            )}

            {/* Compartilhar no WhatsApp (logo após o aviso, antes da oração) */}
            {status === "ENVIADA" && oracaoGerada && (
              <div className="mb-6">
                <WhatsAppShareButton oracaoTexto={oracaoGerada} />
              </div>
            )}

            {/* Prayer Card — só após entrega */}
            {status === "ENVIADA" && oracaoGerada && (
              <div className="border border-clama-gold/40 rounded-xl p-6 bg-[#fffbee] mb-6 text-left">
                <p className="font-sans text-clama-accent text-[0.78rem] tracking-[1px] uppercase mb-3">
                  Sua oração
                </p>
                <p className="font-serif text-clama-night text-[1rem] leading-relaxed whitespace-pre-line">
                  {oracaoGerada}
                </p>
              </div>
            )}

            {/* Verse Card */}
            <div className="border border-[#e0d8f0] rounded-xl p-5 bg-clama-cream mb-8">
              <p className="font-serif text-[#444] text-[0.95rem] italic leading-relaxed">
                "O Espírito do Senhor está sobre mim, porque me ungiu para evangelizar os pobres. Enviou-me para proclamar libertação aos cativos."
              </p>
              <p className="font-sans text-[#8a5cf6] text-[0.78rem] tracking-[1px] uppercase mt-2">
                Lucas 4:18
              </p>
            </div>

            {/* Loading indicator for polling */}
            {!statusInfo.isComplete && !statusInfo.isError && !isLoading && (
              <div className="flex items-center justify-center gap-2 text-[#aaa] text-sm mb-6">
                <LoadingSpinner size={16} />
                <span>Atualizando status...</span>
              </div>
            )}

            {/* Contact button for errors */}
            {statusInfo.isError && pedidoId && (
              <a
                href={`mailto:contato@clama.me?subject=Pedido%20${pedidoId.slice(0, 8)}`}
                className="inline-block mb-4"
              >
                <button className="bg-white text-clama-night border-[1.5px] border-clama-night py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-[#f9f5ff] transition-colors">
                  Falar com a gente
                </button>
              </a>
            )}

            {/* Compartilhar no WhatsApp (segunda CTA, após o versículo) */}
            {status === "ENVIADA" && oracaoGerada && (
              <div className="mb-4">
                <WhatsAppShareButton oracaoTexto={oracaoGerada} />
              </div>
            )}

            {/* CTA */}
            <div>
              <Link to="/">
                <button className="bg-white text-clama-night border-[1.5px] border-clama-night py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-[#f9f5ff] transition-colors">
                  Levar outro clamor
                </button>
              </Link>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

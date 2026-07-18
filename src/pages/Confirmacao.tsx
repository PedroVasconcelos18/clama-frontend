import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiFetch } from "@/lib/api";
import { type PedidoStatus, type PedidoStatusValue } from "@/types/pedido-status.types";
import {
  MSG_CONFIRMACAO_EMAIL,
  MSG_CONFIRMACAO_WHATSAPP,
  MSG_GERANDO_ORACAO,
  MSG_ORACAO_ENVIADA_EMAIL,
  MSG_ORACAO_ENVIADA_WHATSAPP,
  MSG_REAGENDADO,
  MSG_ERRO_DEFINITIVO,
} from "@/lib/pastoral_messages";

import { StickyNav } from "@/components/clama/StickyNav";
import { Footer } from "@/components/clama/Footer";
import { WhatsAppShareButton } from "@/components/clama/WhatsAppShareButton";
import PastoralAlert from "@/components/utility/PastoralAlert";
import LoadingSpinner from "@/components/utility/LoadingSpinner";

const POLL_INTERVAL_MS = 5000;
// ~15 min: enquanto aguarda o pagamento Pix, seguimos consultando o status.
const MAX_POLL_ATTEMPTS = 180;

interface StatusInfo {
  title: string;
  message: string;
  isComplete: boolean;
  isError: boolean;
  isWaiting: boolean;
}

function getStatusMessage(
  status: PedidoStatusValue | null,
  canal: string,
  pastoralMessage?: string | null
): StatusInfo {
  const isEmail = canal === "email";

  switch (status) {
    case "aguardando_pagamento":
      return {
        title: "Quase lá — pague com Pix",
        message:
          "Escaneie o QR code ou copie o código Pix abaixo. Assim que o pagamento cair, sua oração começa a ser preparada — esta tela atualiza sozinha.",
        isComplete: false,
        isError: false,
        isWaiting: false,
      };
    case "pago":
    case "gerando_oracao":
    case "oracao_gerada":
      return {
        title: "Seu clamor foi recebido",
        message: isEmail ? MSG_CONFIRMACAO_EMAIL : MSG_CONFIRMACAO_WHATSAPP,
        isComplete: false,
        isError: false,
        isWaiting: false,
      };
    case "enviada":
      return {
        title: "Sua oração já está aí!",
        message: isEmail ? MSG_ORACAO_ENVIADA_EMAIL : MSG_ORACAO_ENVIADA_WHATSAPP,
        isComplete: true,
        isError: false,
        isWaiting: false,
      };
    case "aguardando_reenvio":
      return {
        title: "Aguardando...",
        message: MSG_REAGENDADO,
        isComplete: false,
        isError: false,
        isWaiting: true,
      };
    case "erro":
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

export default function Confirmacao() {
  const [searchParams] = useSearchParams();
  const pedidoId = searchParams.get("pedido_id");

  const [status, setStatus] = useState<PedidoStatusValue | null>(null);
  const [canal, setCanal] = useState<string>("email");
  const [pastoralMessage, setPastoralMessage] = useState<string | null>(null);
  const [oracaoGerada, setOracaoGerada] = useState<string>("");
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const attemptsRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pedidoId) {
      setIsLoading(false);
      setError("Pedido não encontrado. Retorne à página inicial e tente novamente.");
      return;
    }

    const poll = async () => {
      try {
        const data = await apiFetch<PedidoStatus>(`/api/pedidos/${pedidoId}/`);
        setStatus(data.status);
        setCanal(data.canal_entrega);
        setPastoralMessage(data.pastoral_message ?? null);
        setOracaoGerada(data.oracao_gerada ?? "");
        setPixQrCode(data.pix_qr_code ?? null);
        setPixQrCodeBase64(data.pix_qr_code_base64 ?? null);
        setIsLoading(false);

        // Stop polling when in terminal states
        if (data.status === "enviada" || data.status === "erro") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        setIsLoading(false);
      }

      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_POLL_ATTEMPTS && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    poll();
    intervalRef.current = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pedidoId]);

  const statusInfo = getStatusMessage(status, canal, pastoralMessage);

  return (
    <div className="min-h-screen bg-white">
      <StickyNav />

      <main className="max-w-[480px] mx-auto px-6 py-12 text-center">
        {error && (
          <div className="mb-8">
            <PastoralAlert variant="error">{error}</PastoralAlert>
            <div className="mt-6">
              <Link to="/">
                <button className="bg-white text-clama-night border-[1.5px] border-clama-night py-[0.85rem] px-8 text-[0.95rem] font-semibold font-sans rounded-full hover:bg-[#f9f5ff] transition-colors">
                  Voltar para o início
                </button>
              </Link>
            </div>
          </div>
        )}

        {!error && (
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
            {status === "aguardando_pagamento" && pixQrCode && (
              <div className="border-[1.5px] border-clama-gold/50 rounded-xl p-6 bg-[#fffbee] mb-8">
                {pixQrCodeBase64 && (
                  <img
                    src={`data:image/png;base64,${pixQrCodeBase64}`}
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
                </p>
              </div>
            )}

            {/* Compartilhar no WhatsApp (logo após o aviso, antes da oração) */}
            {status === "enviada" && oracaoGerada && (
              <div className="mb-6">
                <WhatsAppShareButton oracaoTexto={oracaoGerada} />
              </div>
            )}

            {/* Prayer Card — só após entrega */}
            {status === "enviada" && oracaoGerada && (
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
            {status === "enviada" && oracaoGerada && (
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

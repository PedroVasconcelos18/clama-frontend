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
import PastoralAlert from "@/components/utility/PastoralAlert";
import LoadingSpinner from "@/components/utility/LoadingSpinner";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 24;

interface StatusInfo {
  title: string;
  message: string;
  isComplete: boolean;
  isError: boolean;
  isWaiting: boolean;
}

function getStatusMessage(
  status: PedidoStatusValue | null,
  canal: string
): StatusInfo {
  const isEmail = canal === "email";

  switch (status) {
    case "aguardando_pagamento":
      return {
        title: "Processando pagamento...",
        message:
          "Estamos aguardando a confirmação do seu pagamento. Isso pode levar alguns segundos.",
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
        message: MSG_ERRO_DEFINITIVO,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const statusInfo = getStatusMessage(status, canal);

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

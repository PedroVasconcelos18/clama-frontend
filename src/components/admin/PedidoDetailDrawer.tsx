import { useState, useEffect } from "react"
import { useAdminApi } from "@/hooks/useAdminApi"
import { PastoralApiError } from "@/lib/api"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X, ExternalLink, RefreshCw, Gift } from "lucide-react"
import { toast } from "sonner"
import type { AdminPedido } from "@/types/admin.types"

interface PedidoDetailDrawerProps {
  pedidoId: string | null
  onClose: () => void
}

const STATUS_COLORS: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-500/20 text-yellow-400",
  pago: "bg-green-500/20 text-green-400",
  gerando_oracao: "bg-blue-500/20 text-blue-400",
  oracao_enviada: "bg-green-500/20 text-green-400",
  erro: "bg-red-500/20 text-red-400",
  aguardando_reenvio: "bg-yellow-500/20 text-yellow-400",
}

export function PedidoDetailDrawer({ pedidoId, onClose }: PedidoDetailDrawerProps) {
  const { adminFetch } = useAdminApi()
  const [pedido, setPedido] = useState<AdminPedido | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [showConfirmResend, setShowConfirmResend] = useState(false)
  const [isMarkingFree, setIsMarkingFree] = useState(false)
  const [showConfirmFree, setShowConfirmFree] = useState(false)

  useEffect(() => {
    if (!pedidoId) {
      setPedido(null)
      return
    }

    async function loadPedido() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await adminFetch<AdminPedido>(`/api/admin/pedidos/${pedidoId}/`)
        setPedido(data)
      } catch (err) {
        if (err instanceof PastoralApiError) {
          setError(err.pastoralMessage)
        } else {
          setError("Erro ao carregar pedido.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPedido()
  }, [pedidoId, adminFetch])

  const canResend =
    pedido &&
    (pedido.status === "erro" ||
      pedido.status === "aguardando_reenvio" ||
      (pedido.status === "pago" && !pedido.oracao_gerada))

  // Pode marcar gratuito qualquer pedido ainda não enviado e que já não
  // seja gratuito. O backend é a defesa final (409 para enviada).
  const canMarkFree =
    pedido && pedido.status !== "enviada" && !pedido.eh_gratuito

  async function handleResend() {
    if (!pedido) return
    setIsResending(true)
    try {
      await adminFetch(`/api/admin/pedidos/${pedido.id}/reenviar/`, {
        method: "POST",
      })
      toast.success("Reenvio agendado. Acompanhe pelo status.")
      setShowConfirmResend(false)
      // Reload pedido
      const data = await adminFetch<AdminPedido>(`/api/admin/pedidos/${pedido.id}/`)
      setPedido(data)
    } catch (err) {
      if (err instanceof PastoralApiError) {
        toast.error(err.pastoralMessage)
      } else {
        toast.error("Erro ao reenviar pedido.")
      }
    } finally {
      setIsResending(false)
    }
  }

  async function handleMarkFree() {
    if (!pedido) return
    setIsMarkingFree(true)
    try {
      await adminFetch(`/api/admin/pedidos/${pedido.id}/marcar-gratuito/`, {
        method: "POST",
      })
      toast.success("Pedido marcado como gratuito. Gerando oração.")
      setShowConfirmFree(false)
      const data = await adminFetch<AdminPedido>(`/api/admin/pedidos/${pedido.id}/`)
      setPedido(data)
    } catch (err) {
      if (err instanceof PastoralApiError) {
        toast.error(err.pastoralMessage)
      } else {
        toast.error("Erro ao marcar como gratuito.")
      }
    } finally {
      setIsMarkingFree(false)
    }
  }

  const isOpen = !!pedidoId

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:bg-black/30"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-clama-night-deep border-l border-clama-gold/20 transition-transform duration-200 overflow-y-auto",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-clama-night-deep border-b border-clama-gold/20 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-clama-cream/60 text-sm font-mono">
              {pedidoId?.slice(0, 8)}...
            </span>
            {pedido && (
              <span
                className={cn(
                  "px-2 py-1 text-xs rounded",
                  STATUS_COLORS[pedido.status] || "bg-gray-500/20 text-gray-400"
                )}
              >
                {pedido.status.replace(/_/g, " ")}
              </span>
            )}
            {pedido?.eh_gratuito && (
              <span className="px-2 py-1 text-xs rounded bg-clama-gold/20 text-clama-gold">
                Gratuito
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner className="text-clama-gold" />
            </div>
          ) : error ? (
            <PastoralAlert variant="error">{error}</PastoralAlert>
          ) : pedido ? (
            <>
              {/* Pedido Info */}
              <section>
                <h3 className="text-sm font-medium text-clama-gold mb-3">Pedido</h3>
                <div className="space-y-2 text-sm">
                  <Row label="Nome" value={pedido.nome} />
                  <Row label="E-mail" value={pedido.email} />
                  <Row label="Telefone" value={pedido.telefone || "Não informado"} />
                  <Row label="Idade" value={pedido.idade?.toString() || "Não informada"} />
                  <Row label="Sexo" value={pedido.sexo || "Não informado"} />
                  <Row label="Plano" value={`${pedido.plano.nome} (${pedido.plano.valor_reais_str})`} />
                  <Row label="Valor" value={pedido.valor_reais_str} />
                  <Row label="Canal" value={pedido.canal_entrega} />
                  <Row
                    label="Criado em"
                    value={new Date(pedido.created_at).toLocaleString("pt-BR")}
                  />
                </div>
              </section>

              {/* Conteúdo do Pedido */}
              <section>
                <h3 className="text-sm font-medium text-clama-gold mb-3">Conteúdo do Pedido</h3>
                <div className="bg-clama-night rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="text-sm text-clama-cream/80 whitespace-pre-wrap">
                    {pedido.pedido_oracao || "[Pedido vazio]"}
                  </p>
                </div>
              </section>

              {/* Oração Gerada */}
              {pedido.oracao_gerada && (
                <section>
                  <h3 className="text-sm font-medium text-clama-gold mb-3">Oração Gerada</h3>
                  <div className="bg-clama-night rounded-lg p-3 max-h-64 overflow-y-auto">
                    <p className="text-sm text-clama-cream font-serif whitespace-pre-wrap">
                      {pedido.oracao_gerada}
                    </p>
                  </div>
                </section>
              )}

              {/* Pagamento */}
              <section>
                <h3 className="text-sm font-medium text-clama-gold mb-3">Pagamento</h3>
                <div className="space-y-2 text-sm">
                  <Row label="ID do pagamento" value={pedido.provider_payment_id || "N/A"} />
                  {pedido.provider_checkout_url && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-clama-cream/60">Checkout</span>
                      <a
                        href={pedido.provider_checkout_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-clama-gold hover:underline flex items-center gap-1"
                      >
                        Abrir <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* WhatsApp Info */}
              {pedido.canal_entrega === "whatsapp" && (
                <section>
                  <h3 className="text-sm font-medium text-clama-gold mb-3">WhatsApp</h3>
                  <div className="space-y-2 text-sm">
                    <Row label="Message ID" value={pedido.whatsapp_message_id || "N/A"} />
                    <Row
                      label="Entregue em"
                      value={
                        pedido.whatsapp_delivered_at
                          ? new Date(pedido.whatsapp_delivered_at).toLocaleString("pt-BR")
                          : "Aguardando"
                      }
                    />
                    <Row
                      label="Lido em"
                      value={
                        pedido.whatsapp_read_at
                          ? new Date(pedido.whatsapp_read_at).toLocaleString("pt-BR")
                          : "Aguardando"
                      }
                    />
                  </div>
                </section>
              )}

              {/* Error Info */}
              {pedido.last_error && (
                <section>
                  <h3 className="text-sm font-medium text-red-400 mb-3">Último Erro</h3>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-sm text-red-300">{pedido.last_error}</p>
                    <p className="text-xs text-clama-cream/40 mt-2">
                      Tentativas: {pedido.retry_count}
                    </p>
                  </div>
                </section>
              )}

              {/* Webhook Events */}
              {pedido.webhook_events && pedido.webhook_events.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium text-clama-gold mb-3">Histórico de Eventos</h3>
                  <div className="space-y-2">
                    {pedido.webhook_events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between py-2 border-b border-clama-gold/10 last:border-0"
                      >
                        <div>
                          <p className="text-sm text-clama-cream">{event.event_type}</p>
                          <p className="text-xs text-clama-cream/40">{event.status}</p>
                        </div>
                        <span className="text-xs text-clama-cream/60">
                          {new Date(event.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Resend Button */}
              {canResend && (
                <div className="pt-4 border-t border-clama-gold/20">
                  {showConfirmResend ? (
                    <div className="space-y-3">
                      <p className="text-sm text-clama-cream">
                        Reenviar oração para <strong>{pedido.nome}</strong>?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleResend}
                          disabled={isResending}
                          className="flex-1"
                        >
                          {isResending ? (
                            <>
                              <LoadingSpinner className="w-4 h-4 mr-2" />
                              Reenviando...
                            </>
                          ) : (
                            "Confirmar Reenvio"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowConfirmResend(false)}
                          className="text-clama-cream/60 hover:text-clama-cream"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowConfirmResend(true)}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reenviar
                    </Button>
                  )}
                </div>
              )}

              {/* Marcar como gratuito */}
              {canMarkFree && (
                <div className="pt-4 border-t border-clama-gold/20">
                  {showConfirmFree ? (
                    <div className="space-y-3">
                      <p className="text-sm text-clama-cream">
                        Marcar o pedido de <strong>{pedido.nome}</strong> como
                        gratuito? A oração será gerada sem cobrança.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleMarkFree}
                          disabled={isMarkingFree}
                          className="flex-1"
                        >
                          {isMarkingFree ? (
                            <>
                              <LoadingSpinner className="w-4 h-4 mr-2" />
                              Processando...
                            </>
                          ) : (
                            "Confirmar gratuito"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowConfirmFree(false)}
                          className="text-clama-cream/60 hover:text-clama-cream"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowConfirmFree(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Marcar como gratuito
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-clama-cream/60">{label}</span>
      <span className="text-clama-cream">{value}</span>
    </div>
  )
}

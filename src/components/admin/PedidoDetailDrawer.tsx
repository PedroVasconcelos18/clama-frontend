import { useState, useEffect } from "react"
import { useApi } from "@/hooks/useApi"
import { PastoralApiError } from "@/lib/api"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X, Pencil } from "lucide-react"
import { PedidoEditForm } from "@/components/admin/PedidoEditForm"
import { PEDIDO_STATUS_COLORS, rotuloDoStatus } from "@/lib/pedido-status"
import { formatarDataHora } from "@/lib/datetime"
import { formatCurrency } from "@/lib/formatters"
import type { AdminPedidoDetalhe } from "@/types/admin.types"

interface PedidoDetailDrawerProps {
  pedidoId: string | null
  onClose: () => void
  /** Chamado depois de salvar uma edição, para a lista recarregar. */
  onChanged?: () => void
}

/**
 * Detalhe do pedido no admin: dados, cobranças, repasse, eventos do MP e último erro.
 * Só edição de dados (D22). Gratuidade, reenvio e regeneração voltam na 4b (D10).
 */
export function PedidoDetailDrawer({ pedidoId, onClose, onChanged }: PedidoDetailDrawerProps) {
  const { fetchApi } = useApi()
  const [pedido, setPedido] = useState<AdminPedidoDetalhe | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setEditing(false)
    if (!pedidoId) {
      setPedido(null)
      return
    }

    async function loadPedido() {
      setIsLoading(true)
      setError(null)
      try {
        setPedido(await fetchApi<AdminPedidoDetalhe>(`/api/admin/pedidos/${pedidoId}`))
      } catch (err) {
        setError(err instanceof PastoralApiError ? err.pastoralMessage : "Erro ao carregar pedido.")
      } finally {
        setIsLoading(false)
      }
    }

    loadPedido()
  }, [pedidoId, fetchApi])

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
                  PEDIDO_STATUS_COLORS[pedido.status ?? ""] || "bg-gray-500/20 text-gray-400"
                )}
              >
                {rotuloDoStatus(pedido.status)}
              </span>
            )}
            {pedido?.gratuito && (
              <span className="px-2 py-1 text-xs rounded bg-clama-gold/20 text-clama-gold">
                Gratuito
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fechar"
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
            editing ? (
              <PedidoEditForm
                pedido={pedido}
                onSaved={(p) => {
                  setPedido(p)
                  setEditing(false)
                  onChanged?.()
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
            <>
              <Button variant="outline" className="w-full" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar pedido
              </Button>
              {/* Pedido Info */}
              <section>
                <h3 className="text-sm font-medium text-clama-gold mb-3">Pedido</h3>
                <div className="space-y-2 text-sm">
                  <Row label="Nome" value={pedido.nome ?? "—"} />
                  <Row label="E-mail" value={pedido.email ?? "—"} />
                  <Row label="Telefone" value={pedido.telefone || "Não informado"} />
                  <Row label="Idade" value={pedido.idade?.toString() || "Não informada"} />
                  <Row label="Sexo" value={pedido.sexo || "Não informado"} />
                  <Row
                    label="Plano"
                    value={pedido.plano ? `${pedido.plano.nome} (${formatCurrency(pedido.plano.valorCentavos ?? 0)})` : "—"}
                  />
                  <Row label="Valor" value={formatCurrency(pedido.valorCentavos ?? 0)} />
                  <Row label="Instituição" value={pedido.instituicao?.nome ?? "Nenhuma"} />
                  <Row label="Conta" value={pedido.usuarioId != null ? `#${pedido.usuarioId}` : "Sem conta"} />
                  <Row label="Criado em" value={formatarDataHora(pedido.criadoEm)} />
                  <Row label="Atualizado em" value={formatarDataHora(pedido.atualizadoEm)} />
                </div>
              </section>

              {/* Conteúdo do Pedido */}
              <section>
                <h3 className="text-sm font-medium text-clama-gold mb-3">Conteúdo do Pedido</h3>
                <div className="bg-clama-night rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="text-sm text-clama-cream/80 whitespace-pre-wrap">
                    {pedido.pedidoOracao || "[Pedido vazio]"}
                  </p>
                </div>
              </section>

              {/* Oração Gerada */}
              {pedido.oracaoGerada && (
                <section>
                  <h3 className="text-sm font-medium text-clama-gold mb-3">Oração Gerada</h3>
                  <div className="bg-clama-night rounded-lg p-3 max-h-64 overflow-y-auto">
                    <p className="text-sm text-clama-cream font-serif whitespace-pre-wrap">{pedido.oracaoGerada}</p>
                  </div>
                </section>
              )}

              {/* Cobranças Pix (histórico; a mais nova primeiro) */}
              <section>
                <h3 className="text-sm font-medium text-clama-gold mb-3">Cobranças Pix</h3>
                {pedido.cobrancas?.length ? (
                  <ul className="space-y-2 text-sm">
                    {[...pedido.cobrancas].reverse().map((c) => (
                      <li key={c.n} className="border-b border-clama-gold/10 pb-2 last:border-0">
                        <p className="text-clama-cream">{`#${c.n} · ${c.status}`}</p>
                        <p className="text-xs text-clama-cream/50">
                          Criada {formatarDataHora(c.criadaEm)}
                          {c.pagaEm && ` · paga ${formatarDataHora(c.pagaEm)}`}
                          {!c.pagaEm && c.canceladaEm && ` · cancelada ${formatarDataHora(c.canceladaEm)}`}
                          {!c.pagaEm && !c.canceladaEm && ` · vence ${formatarDataHora(c.expiraEm)}`}
                        </p>
                        {c.mpPagamentoId != null && (
                          <p className="font-mono text-xs text-clama-cream/40">MP {c.mpPagamentoId}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-clama-cream/50">Nenhuma cobrança.</p>
                )}
              </section>

              {/* Repasse */}
              <section>
                <h3 className="text-sm font-medium text-clama-gold mb-3">Repasse</h3>
                {pedido.repasse ? (
                  <div className="text-sm">
                    <p className="text-clama-cream">
                      {`${pedido.repasse.status} · ${formatCurrency(pedido.repasse.valorCentavos ?? 0)} (${pedido.repasse.percentual}%)`}
                    </p>
                    <p className="text-xs text-clama-cream/50">
                      Registrado {formatarDataHora(pedido.repasse.criadoEm)}
                      {pedido.repasse.transferidoEm && ` · transferido ${formatarDataHora(pedido.repasse.transferidoEm)}`}
                      {pedido.repasse.canceladoEm && ` · cancelado ${formatarDataHora(pedido.repasse.canceladoEm)}`}
                      {pedido.repasse.motivo && ` (${pedido.repasse.motivo})`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-clama-cream/50">Sem repasse.</p>
                )}
              </section>

              {/* Último erro */}
              {pedido.ultimoErro && (
                <section>
                  <h3 className="text-sm font-medium text-red-400 mb-3">Último erro</h3>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-sm text-red-300">{pedido.ultimoErro}</p>
                    <p className="text-xs text-clama-cream/40 mt-2">Tentativas: {pedido.tentativas ?? 0}</p>
                  </div>
                </section>
              )}

              {/* Eventos do Mercado Pago */}
              {pedido.eventos && pedido.eventos.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium text-clama-gold mb-3">Eventos do Mercado Pago</h3>
                  <div className="space-y-2">
                    {pedido.eventos.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between py-2 border-b border-clama-gold/10 last:border-0"
                      >
                        <div>
                          <p className="text-sm text-clama-cream">{`${event.tipo} · ${event.status}`}</p>
                          {event.motivo && <p className="text-xs text-clama-cream/40">{event.motivo}</p>}
                        </div>
                        <span className="text-xs text-clama-cream/60">{formatarDataHora(event.recebidoEm)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
            )
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

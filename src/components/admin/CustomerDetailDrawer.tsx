import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useAdminApi } from "@/hooks/useAdminApi"
import { PastoralApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import type { AdminCustomerDetail } from "@/types/admin.types"

interface Props {
  customerId: number | null
  onClose: () => void
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR")
}

export function CustomerDetailDrawer({ customerId, onClose }: Props) {
  const { adminFetch } = useAdminApi()
  const [data, setData] = useState<AdminCustomerDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customerId) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    adminFetch<AdminCustomerDetail>(`/api/admin/customers/${customerId}/`)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof PastoralApiError) {
          setError(err.pastoralMessage)
        } else {
          setError("Erro ao carregar customer.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adminFetch, customerId])

  if (!customerId) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[560px] overflow-y-auto bg-clama-night-deep border-l border-clama-gold/20 shadow-xl"
        role="dialog"
        aria-label="Detalhes do customer"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-clama-gold/20 bg-clama-night-deep px-5 py-4">
          <h2 className="font-serif text-lg text-clama-gold">Detalhes do customer</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Fechar"
            className="text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="p-5 space-y-5">
          {loading && (
            <div className="flex justify-center py-10">
              <LoadingSpinner size={24} />
            </div>
          )}

          {error && !loading && <PastoralAlert variant="error">{error}</PastoralAlert>}

          {data && !loading && !error && (
            <>
              <Section title="Identidade">
                <Field label="Email" value={data.email} />
                <Field label="Nome completo" value={data.nome_completo || "—"} />
                <Field label="ID" value={String(data.id)} />
                <Field
                  label="Papel"
                  value={data.is_clama_admin ? "Admin Clama" : "Customer"}
                />
                <Field
                  label="Ativo"
                  value={data.is_active ? "Sim" : "Inativo (soft-deleted)"}
                />
                <Field
                  label="Nome no blog"
                  value={
                    data.nome_format_blog === "completo"
                      ? "Completo"
                      : "Compacto (primeiro nome + inicial)"
                  }
                />
              </Section>

              <Section title="Dados sensíveis (LGPD)">
                <Field label="CPF/CNPJ" value={data.cpf_cnpj || "—"} mono />
                <Field label="Telefone" value={data.telefone || "—"} mono />
              </Section>

              <Section title="Timeline">
                <Field label="Cadastro" value={fmt(data.date_joined)} />
                <Field label="Último login" value={fmt(data.last_login)} />
                <Field
                  label="Pedido gratuito usado em"
                  value={fmt(data.freemium_used_at)}
                />
              </Section>

              <Section title="Atividade">
                <Field label="Pedidos totais" value={String(data.total_pedidos)} />
                <Field
                  label="Pedidos pagos"
                  value={String(data.pedidos_pagos)}
                />
                <Field
                  label="Pedidos gratuitos"
                  value={String(data.pedidos_gratuitos)}
                />
                <Field
                  label="Comentários no blog"
                  value={String(data.total_comentarios)}
                />
              </Section>

              <Section title="Moderação do blog">
                <Field
                  label="Status"
                  value={data.is_banned ? "Banido" : "Sem banimento ativo"}
                />
                {data.banimentos.length === 0 ? (
                  <p className="text-sm text-clama-cream/60 mt-2">
                    Nenhum banimento aplicado.
                  </p>
                ) : (
                  <ul className="space-y-2 mt-2">
                    {data.banimentos.map((b) => (
                      <li
                        key={b.id}
                        className={
                          b.revogado_em
                            ? "border border-clama-gold/15 rounded-md p-3 text-sm bg-clama-night/40"
                            : "border border-red-400/30 rounded-md p-3 text-sm bg-red-400/5"
                        }
                      >
                        <p className="text-clama-cream">{b.motivo}</p>
                        <p className="text-xs text-clama-cream/60 mt-1">
                          Banido em {fmt(b.banido_em)} por {b.banido_por_email}
                        </p>
                        {b.revogado_em && (
                          <p className="text-xs text-emerald-300 mt-1">
                            Revogado em {fmt(b.revogado_em)}
                            {b.revogado_por_email
                              ? ` por ${b.revogado_por_email}`
                              : ""}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="font-sans text-xs font-bold tracking-[2px] uppercase text-clama-gold mb-2">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm">
      <span className="text-clama-cream/60">{label}</span>
      <span
        className={
          mono
            ? "font-mono text-clama-cream"
            : "text-clama-cream break-words"
        }
      >
        {value}
      </span>
    </div>
  )
}

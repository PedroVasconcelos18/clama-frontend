import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useApi } from "@/hooks/useApi"
import { useSessao } from "@/contexts/SessaoContext"
import { PastoralApiError } from "@/lib/api"
import { formatarDataHora } from "@/lib/datetime"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { CustomerAcesso } from "@/components/admin/CustomerAcesso"
import { CustomerBlog } from "@/components/admin/CustomerBlog"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { ROTULO_PAPEL, type UsuarioAdmin } from "@/types/usuario-admin"

interface Props {
  usuarioId: number | null
  onClose: () => void
  /** Depois de qualquer escrita (acesso, senha, exclusão): a lista recarrega. */
  onChanged?: () => void
}

/**
 * Detalhe do usuário: o que a conta tem e a moderação do blog (comentários e banimento).
 */
export function CustomerDetailDrawer({ usuarioId, onClose, onChanged }: Props) {
  const { fetchApi } = useApi()
  const { usuario } = useSessao()
  const [data, setData] = useState<UsuarioAdmin | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!usuarioId) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchApi<UsuarioAdmin>(`/api/admin/usuarios/${usuarioId}`)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof PastoralApiError ? err.pastoralMessage : "Erro ao carregar o usuário.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchApi, usuarioId, refresh])

  if (!usuarioId) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[560px] overflow-y-auto bg-clama-night-deep border-l border-clama-gold/20 shadow-xl"
        role="dialog"
        aria-label="Detalhes do usuário"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-clama-gold/20 bg-clama-night-deep px-5 py-4">
          <h2 className="font-serif text-lg text-clama-gold">Detalhes do usuário</h2>
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
                <Field label="E-mail" value={data.email} />
                <Field label="Nome completo" value={data.nomeCompleto || "—"} />
                <Field label="ID" value={String(data.id)} />
                <Field label="Papel" value={ROTULO_PAPEL[data.papel]} />
                <Field label="Situação" value={data.ativo ? "Ativa" : "Inativa"} />
                <Field label="Senha" value={data.temSenha ? "Definida" : "Ainda não definida"} />
              </Section>

              {usuario?.papel === "SUPERUSUARIO" && (
                <CustomerAcesso
                  customer={data}
                  onChanged={() => {
                    setRefresh((n) => n + 1)
                    onChanged?.()
                  }}
                />
              )}

              <CustomerBlog usuarioId={data.id} papel={data.papel} />

              <Section title="Linha do tempo">
                <Field label="Cadastro" value={formatarDataHora(data.criadoEm)} />
                <Field label="Último login" value={formatarDataHora(data.ultimoLoginEm)} />
              </Section>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-sans text-xs font-bold tracking-[2px] uppercase text-clama-gold mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm">
      <span className="text-clama-cream/60">{label}</span>
      <span className="text-clama-cream break-words">{value}</span>
    </div>
  )
}

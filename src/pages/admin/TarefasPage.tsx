import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { useApi } from "@/hooks/useApi"
import { usePaginaAdmin } from "@/hooks/useAdminList"
import { AdminPager } from "@/components/admin/AdminPager"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { formatarDataHora } from "@/lib/datetime"
import type { components } from "@/types/api-schema"

type Tarefa = components["schemas"]["Tarefa"]
type Execucao = components["schemas"]["ExecucaoAdmin"]

const SITUACAO: Record<string, { rotulo: string; forte: boolean }> = {
  ok: { rotulo: "Em dia", forte: false },
  nao_agendada: { rotulo: "Não agendada", forte: true },
  atrasada: { rotulo: "Atrasada", forte: true },
  falhou: { rotulo: "Falhou", forte: true },
}

/** Tarefas recorrentes: situação, "Rodar agora" (simulado por padrão) e histórico paginado. */
export default function TarefasPage() {
  const { fetchApi } = useApi()
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [historico, setHistorico] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [alvo, setAlvo] = useState<string | null>(null)
  const [simular, setSimular] = useState(true)
  const [busy, setBusy] = useState(false)
  const [erroRodar, setErroRodar] = useState<string | null>(null)

  const releitura = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(releitura.current), [])

  useEffect(() => {
    fetchApi<Tarefa[]>("/api/admin/tarefas", { showToast: false })
      .then((t) => {
        setTarefas(t)
        setErro(null)
      })
      .catch((e: { pastoralMessage?: string }) => setErro(e?.pastoralMessage ?? "Não foi possível carregar as tarefas."))
  }, [fetchApi, reloadToken])

  const recarregar = () => setReloadToken((n) => n + 1)

  function abrir(nome: string) {
    setAlvo(nome)
    setSimular(true)
    setErroRodar(null)
  }

  async function rodar() {
    if (!alvo) return
    setBusy(true)
    try {
      await fetchApi(`/api/admin/tarefas/${alvo}/execucoes`, {
        method: "POST",
        body: JSON.stringify({ simulacao: simular }),
        showToast: false,
      })
      toast.success(simular ? "Simulação enfileirada." : "Execução enfileirada.")
      setAlvo(null)
      recarregar()
      clearTimeout(releitura.current)
      releitura.current = setTimeout(recarregar, 3000) // a fila é assíncrona: relê quando ela já deve ter rodado
    } catch (err) {
      setErroRodar((err as { pastoralMessage?: string })?.pastoralMessage ?? "Não foi possível rodar a tarefa.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-clama-gold">Tarefas</h1>
          <p className="text-sm text-clama-cream/60">Rotinas agendadas: quando rodam, como rodaram e como disparar uma.</p>
        </div>
        <Button variant="outline" size="sm" onClick={recarregar}>Atualizar</Button>
      </header>

      {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
      {!tarefas && !erro && <LoadingSpinner size={20} />}

      <div className="space-y-3">
        {tarefas?.map((t) => {
          const s = SITUACAO[t.situacao ?? "ok"] ?? { rotulo: t.situacao ?? "?", forte: true }
          const u = t.ultima
          return (
            <section key={t.nome} aria-label={t.nome}
              className={`rounded-md border p-4 ${s.forte ? "border-red-500/60 bg-red-500/5" : "border-clama-gold/20 bg-clama-night-deep"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-mono text-clama-cream">{t.nome}</h2>
                  <p className="text-xs text-clama-cream/60">
                    cron <code>{t.cron}</code> · {t.simulacaoConfigurada ? "modo simulado" : "modo real"} · próxima:{" "}
                    {formatarDataHora(t.proximaExecucao)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.rodandoAgora && <span className="rounded bg-clama-gold/20 px-2 py-1 text-xs text-clama-gold">Rodando agora</span>}
                  <span className={s.forte ? "rounded bg-red-500/20 px-2 py-1 text-sm font-semibold text-red-300" : "rounded bg-emerald-500/10 px-2 py-1 text-sm text-emerald-300"}>
                    {s.rotulo}
                  </span>
                </div>
              </div>
              {(t.situacao === "nao_agendada" || t.situacao === "atrasada") && (
                <p className="mt-2 text-sm text-red-300">O agendador não está rodando esta tarefa.</p>
              )}
              <p className="mt-2 text-sm text-clama-cream/80">
                {u ? (
                  <>
                    Última: {formatarDataHora(u.inicio)} · {u.ok ? "ok" : <strong className="text-red-300">falhou</strong>}
                    {u.simulacao && " (simulação)"}
                    {u.manual && " (manual)"}
                    {u.resumo && ` · ${u.resumo}`}
                    {!u.ok && u.erro && ` · ${u.erro}`}
                  </>
                ) : (
                  "Nunca rodou."
                )}
                {!!t.falhasSeguidas && <span className="text-red-300"> · {t.falhasSeguidas} falha(s) seguida(s)</span>}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => abrir(t.nome!)}>Rodar agora</Button>
                <Button size="sm" variant="outline"
                  onClick={() => { setHistorico(historico === t.nome ? null : t.nome!); setOffset(0) }}>
                  {historico === t.nome ? "Esconder histórico" : "Histórico"}
                </Button>
              </div>
              {historico === t.nome && (
                <Historico nome={t.nome!} offset={offset} setOffset={setOffset} reloadToken={reloadToken} />
              )}
            </section>
          )
        })}
      </div>

      <Dialog open={!!alvo} onOpenChange={(open) => !open && !busy && setAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rodar agora: {alvo}</DialogTitle>
            <DialogDescription>
              Simulando, a tarefa lê e calcula, mas não grava nem envia nada. Rodando de verdade, ela faz tudo.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm text-clama-cream">
            <input type="checkbox" checked={simular} onChange={(e) => setSimular(e.target.checked)} />
            Só simular
          </label>
          {erroRodar && <PastoralAlert variant="error">{erroRodar}</PastoralAlert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvo(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={rodar} disabled={busy}>
              {busy ? "Enfileirando…" : simular ? "Simular" : "Rodar de verdade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Historico({ nome, offset, setOffset, reloadToken }: {
  nome: string; offset: number; setOffset: (n: number) => void; reloadToken: number
}) {
  const { data, loading, error } = usePaginaAdmin<Execucao>(`/api/admin/tarefas/${nome}/execucoes`, {}, offset, reloadToken)
  const linhas = data?.content ?? []
  return (
    <div className="mt-3 space-y-2">
      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}
      {loading && <LoadingSpinner size={16} />}
      {!loading && !error && linhas.length === 0 && <p className="text-sm text-clama-cream/60">Sem execuções.</p>}
      <ul className="space-y-1 text-sm text-clama-cream/80">
        {linhas.map((e) => (
          <li key={e.id} data-testid="execucao">
            {formatarDataHora(e.inicio)} · {e.ok ? "ok" : "falhou"}
            {e.simulacao ? " · simulação" : " · real"}
            {e.manual ? " · manual" : " · agendada"}
            {e.resumo && ` · ${e.resumo}`}
            {!e.ok && e.erro && ` · ${e.erro}`}
          </li>
        ))}
      </ul>
      <AdminPager offset={offset} total={data?.page.totalElements ?? 0} onChange={setOffset} />
    </div>
  )
}

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { useApi } from "@/hooks/useApi"
import { usePaginaAdmin } from "@/hooks/useAdminList"
import { AdminPager } from "@/components/admin/AdminPager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { formatCurrency } from "@/lib/formatters"
import type { AdminInstituicao } from "@/types/admin.types"
import type { components } from "@/types/api-schema"

type Previa = components["schemas"]["PreviaDoRelatorio"]
type Auditoria = components["schemas"]["AuditoriaDoLedgerAdmin"]
type Resumo = components["schemas"]["Resumo"]
type Modo = "ciclo" | "mes" | "datas"

const SELECT = "mt-1 block bg-clama-night border border-clama-gold/30 text-clama-cream rounded-md h-9 px-2 text-sm"
const ROTULO = "text-xs uppercase tracking-wider text-clama-gold/80"
const BOTAO_LINK = "inline-flex h-8 items-center rounded-md border border-clama-gold/40 px-3 text-sm text-clama-gold hover:bg-clama-gold/10"
const BASE = import.meta.env.VITE_API_URL ?? ""

/** "2026-11-27" -> "27/11/2026" sem passar por Date (sem fuso). */
const dia = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "—")

/** Relatório de repasse por instituição: prévia, CSVs, quitação em lote e conferência do ledger. */
export default function RelatoriosRepassePage() {
  const { fetchApi } = useApi()
  const [instituicoes, setInstituicoes] = useState<AdminInstituicao[]>([])
  const [instId, setInstId] = useState("")
  const [modo, setModo] = useState<Modo>("ciclo")
  const [mes, setMes] = useState("")
  const [de, setDe] = useState("")
  const [ate, setAte] = useState("")
  const [reloadToken, setReloadToken] = useState(0)
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [internoAberto, setInternoAberto] = useState(false)
  const [loteAberto, setLoteAberto] = useState(false)
  const [comprovante, setComprovante] = useState("")
  const [busy, setBusy] = useState(false)
  const [erroLote, setErroLote] = useState<string | null>(null)
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null)
  const [erroAuditoria, setErroAuditoria] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    fetchApi<AdminInstituicao[]>("/api/admin/instituicoes", { showToast: false })
      .then(setInstituicoes)
      .catch(() => setInstituicoes([]))
  }, [fetchApi])

  // O período vai na query; ciclo = sem parâmetros (a API resolve o ciclo fechado 28→27).
  const periodo = new URLSearchParams()
  if (modo === "mes" && mes) periodo.set("mes", mes)
  if (modo === "datas" && de && ate) periodo.set("de", de)
  if (modo === "datas" && de && ate) periodo.set("ate", ate)
  const completo = modo === "ciclo" || (modo === "mes" && !!mes) || (modo === "datas" && !!de && !!ate)
  const query = new URLSearchParams({ instituicaoId: instId, ...Object.fromEntries(periodo) }).toString()

  useEffect(() => {
    if (!instId || !completo) {
      setPrevia(null)
      return
    }
    let cancelado = false
    setCarregando(true)
    setErro(null)
    fetchApi<Previa>(`/api/admin/repasses/relatorio?${query}`, { showToast: false })
      .then((p) => !cancelado && setPrevia(p))
      .catch((e: { pastoralMessage?: string }) => {
        if (cancelado) return
        setPrevia(null)
        setErro(e?.pastoralMessage ?? "Não foi possível gerar o relatório.")
      })
      .finally(() => !cancelado && setCarregando(false))
    return () => {
      cancelado = true
    }
  }, [fetchApi, instId, completo, query, reloadToken])

  const { data: mensais, loading: carregandoMensais, error: erroMensais } =
    usePaginaAdmin<Resumo>("/api/admin/repasses/relatorios-mensais", {}, offset, reloadToken)

  async function conferir() {
    setErroAuditoria(null)
    try {
      setAuditoria(await fetchApi<Auditoria>("/api/admin/repasses/auditoria", { showToast: false }))
    } catch (e) {
      setAuditoria(null)
      setErroAuditoria((e as { pastoralMessage?: string })?.pastoralMessage ?? "A conferência não rodou.")
    }
  }

  async function quitar() {
    if (!previa || !comprovante.trim()) return
    setBusy(true)
    setErroLote(null)
    try {
      await fetchApi("/api/admin/repasses/transferencias", {
        method: "POST",
        body: JSON.stringify({
          instituicaoId: Number(instId), de: previa.de, ate: previa.ate,
          comprovante: comprovante.trim(), quantidade: previa.pendentes,
        }),
        showToast: false,
      })
      toast.success("Repasses marcados como transferidos.")
      setLoteAberto(false)
      setComprovante("")
      setReloadToken((n) => n + 1)
    } catch (e) {
      // 409: o recorte mudou desde a prévia; mostra a mensagem e relê a prévia, sem fechar o diálogo.
      setErroLote((e as { pastoralMessage?: string })?.pastoralMessage ?? "Não foi possível marcar os repasses.")
      setReloadToken((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  const pendentes = previa?.pendentes ?? 0
  const csv = (rota: string) => `${BASE}/api/admin/repasses/${rota}?${query}`
  const linhas = previa?.linhas ?? []
  const qtd = previa?.quantidade ?? 0

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl text-clama-gold">Relatórios de repasse</h1>
        <p className="text-sm text-clama-cream/60">Por instituição e período; o ciclo padrão vai do dia 28 ao 27.</p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3">
        <div>
          <Label htmlFor="rel-inst" className={ROTULO}>Instituição</Label>
          <select id="rel-inst" value={instId} onChange={(e) => setInstId(e.target.value)} className={SELECT}>
            <option value="">Escolha…</option>
            {instituicoes.map((i) => (
              <option key={i.id} value={i.id}>{i.nome}{i.ativo ? "" : " (inativa)"}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="rel-modo" className={ROTULO}>Período</Label>
          <select id="rel-modo" value={modo} onChange={(e) => setModo(e.target.value as Modo)} className={SELECT}>
            <option value="ciclo">Ciclo fechado (28 a 27)</option>
            <option value="mes">Mês</option>
            <option value="datas">Datas</option>
          </select>
        </div>
        {modo === "mes" && (
          <div>
            <Label htmlFor="rel-mes" className={ROTULO}>Mês</Label>
            <input id="rel-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)}
              className={`${SELECT} [color-scheme:dark]`} />
          </div>
        )}
        {modo === "datas" && (
          <>
            <div>
              <Label htmlFor="rel-de" className={ROTULO}>De</Label>
              <input id="rel-de" type="date" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)}
                className={`${SELECT} [color-scheme:dark]`} />
            </div>
            <div>
              <Label htmlFor="rel-ate" className={ROTULO}>Até</Label>
              <input id="rel-ate" type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)}
                className={`${SELECT} [color-scheme:dark]`} />
            </div>
          </>
        )}
      </div>

      {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
      {carregando && <LoadingSpinner size={20} />}

      {previa && (
        <section aria-label="Prévia" className="space-y-3">
          <p className="text-sm text-clama-cream/80">
            {previa.instituicao} · período {dia(previa.de)} a {dia(previa.ate)}
          </p>
          <div className="overflow-x-auto rounded-md border border-clama-gold/20">
            <table className="w-full text-left text-sm">
              <thead className="bg-clama-night-deep text-clama-cream/70">
                <tr>
                  <th className="p-3">Data</th><th className="p-3">Doador</th><th className="p-3">Referência</th>
                  <th className="p-3 text-right">Doado</th><th className="p-3 text-right">%</th>
                  <th className="p-3 text-right">Repasse</th><th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-clama-cream/60">Nenhuma doação no período.</td></tr>
                )}
                {linhas.map((l, i) => (
                  <tr key={i} className="border-t border-clama-gold/10">
                    <td className="p-3 text-clama-cream/60">{dia(l.data)}</td>
                    <td className="p-3 text-clama-cream">{l.doador}</td>
                    <td className="p-3 font-mono text-xs text-clama-cream/60">{l.referencia}</td>
                    <td className="p-3 text-right">{formatCurrency(l.valorDoadoCentavos ?? 0)}</td>
                    <td className="p-3 text-right">{l.percentual}%</td>
                    <td className="p-3 text-right">{formatCurrency(l.valorRepasseCentavos ?? 0)}</td>
                    <td className="p-3">{l.status}</td>
                  </tr>
                ))}
                <tr className="border-t border-clama-gold/30 font-semibold text-clama-cream">
                  <td className="p-3" colSpan={3}>TOTAL ({qtd} {qtd === 1 ? "doação" : "doações"})</td>
                  <td className="p-3 text-right">{formatCurrency(previa.totalDoadoCentavos ?? 0)}</td>
                  <td className="p-3" />
                  <td className="p-3 text-right">{formatCurrency(previa.totalRepasseCentavos ?? 0)}</td>
                  <td className="p-3" />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-clama-cream/70">
            {pendentes} pendente(s), {formatCurrency(previa.totalPendenteCentavos ?? 0)} a repassar.
          </p>
          <div className="flex flex-wrap gap-2">
            <a className={BOTAO_LINK} href={csv("relatorio.csv")} download>Baixar CSV da instituição</a>
            <Button variant="outline" size="sm" onClick={() => setInternoAberto(true)}
              className="border-red-500/50 text-red-300 hover:bg-red-500/10">Baixar auditoria interna</Button>
            {pendentes > 0 && (
              <Button size="sm" onClick={() => { setErroLote(null); setLoteAberto(true) }}>
                Marcar {pendentes} pendentes como transferidos
              </Button>
            )}
          </div>
        </section>
      )}

      <section aria-label="Ledger" className="space-y-2">
        <h2 className="font-serif text-lg text-clama-gold">Ledger</h2>
        <Button variant="outline" size="sm" onClick={conferir}>Conferir ledger</Button>
        {erroAuditoria && <PastoralAlert variant="error">{erroAuditoria}</PastoralAlert>}
        {auditoria && ((auditoria.achados ?? []).length === 0 ? (
          <PastoralAlert variant="success">Ledger consistente: nenhum achado.</PastoralAlert>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-clama-cream/80">
              {auditoria.criticos} crítico(s), {formatCurrency(auditoria.emJogoCentavos ?? 0)} em jogo.
            </p>
            <ul className="space-y-1 text-sm">
              {auditoria.achados!.map((a, i) => (
                <li key={i} className={a.gravidade === "CRITICO" ? "text-red-300" : "text-amber-300"}>
                  <strong>{a.gravidade === "CRITICO" ? "Crítico" : "Atenção"}</strong> · {a.tipo}
                  {a.instituicao && ` · ${a.instituicao}`} · {a.detalhe}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-label="Ciclos gerados" className="space-y-2">
        <h2 className="font-serif text-lg text-clama-gold">Ciclos gerados</h2>
        {erroMensais && <PastoralAlert variant="error">{erroMensais}</PastoralAlert>}
        <div className="overflow-x-auto rounded-md border border-clama-gold/20">
          <table className="w-full text-left text-sm">
            <thead className="bg-clama-night-deep text-clama-cream/70">
              <tr>
                <th className="p-3">Gerado em</th><th className="p-3">Instituição</th><th className="p-3">Período</th>
                <th className="p-3 text-right">Doações</th><th className="p-3 text-right">Repasse</th><th className="p-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {carregandoMensais && <tr><td colSpan={6} className="p-6 text-center"><LoadingSpinner size={20} /></td></tr>}
              {!carregandoMensais && !erroMensais && (mensais?.content ?? []).length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-clama-cream/60">Nenhum ciclo gerado ainda.</td></tr>
              )}
              {(mensais?.content ?? []).map((m) => (
                <tr key={m.id} className="border-t border-clama-gold/10">
                  <td className="p-3 text-clama-cream/60">{formatarDataHora(m.geradoEm)}</td>
                  <td className="p-3 text-clama-cream">{m.instituicao}</td>
                  <td className="p-3">{dia(m.de)} a {dia(m.ate)}</td>
                  <td className="p-3 text-right">{m.quantidade}</td>
                  <td className="p-3 text-right">{formatCurrency(m.totalRepasseCentavos ?? 0)}</td>
                  <td className="p-3">
                    {m.totalAgoraCentavos !== m.totalRepasseCentavos
                      ? <span className="text-amber-300">mudou desde a geração (agora {formatCurrency(m.totalAgoraCentavos ?? 0)})</span>
                      : "igual ao gerado"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPager offset={offset} total={mensais?.page.totalElements ?? 0} onChange={setOffset} />
      </section>

      <Dialog open={internoAberto} onOpenChange={setInternoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>USO INTERNO</DialogTitle>
            <DialogDescription>
              Contém nome completo, e-mail e id de pagamento. Não entregar à instituição.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInternoAberto(false)}>Cancelar</Button>
            <a className={BOTAO_LINK} href={csv("relatorio-interno.csv")} download onClick={() => setInternoAberto(false)}>
              Entendi, baixar
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loteAberto} onOpenChange={(o) => !o && !busy && setLoteAberto(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar {pendentes} como transferidos?</DialogTitle>
            <DialogDescription>
              Confirme que {formatCurrency(previa?.totalPendenteCentavos ?? 0)} já foram transferidos para{" "}
              {previa?.instituicao}. Depois disso, um estorno vira acerto no próximo ciclo.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="lote-comprovante" className={ROTULO}>Comprovante</Label>
            <Input id="lote-comprovante" value={comprovante} maxLength={120} required
              placeholder="Identificador do Pix ou número do recibo" onChange={(e) => setComprovante(e.target.value)} />
          </div>
          {erroLote && <PastoralAlert variant="error">{erroLote}</PastoralAlert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoteAberto(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={quitar} disabled={busy || !comprovante.trim()}>
              {busy ? "Marcando…" : "Confirmar transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

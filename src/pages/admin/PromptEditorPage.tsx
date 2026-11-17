import { useCallback, useEffect, useState } from "react"
import { useApi } from "@/hooks/useApi"
import { PastoralApiError } from "@/lib/api"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import type { components } from "@/types/api-schema"

type Versao = components["schemas"]["VersaoDePrompt"]
type Conteudo = components["schemas"]["Prompt"]

// Mesmos @Size do backend (Prompt no OpenAPI).
// semUso: a v2 manda sempre a instrução com versículo; os outros três campos seguem no contrato.
const CAMPOS: { chave: keyof Conteudo; rotulo: string; max: number; linhas: number; semUso?: boolean }[] = [
  { chave: "sistema", rotulo: "System prompt", max: 50000, linhas: 10 },
  { chave: "simples", rotulo: "Instrução simples", max: 5000, linhas: 4, semUso: true },
  { chave: "comVersiculo", rotulo: "Instrução com versículo", max: 5000, linhas: 4 },
  { chave: "comProfeciaEVersiculos", rotulo: "Instrução com profecia e versículos", max: 5000, linhas: 4, semUso: true },
  { chave: "gratuito", rotulo: "Instrução do plano gratuito", max: 5000, linhas: 4, semUso: true },
]
const VAZIO: Conteudo = { sistema: "", simples: "", comVersiculo: "", comProfeciaEVersiculos: "", gratuito: "" }

const rotulo = (v: Versao) => (v.padrao ? "Padrão" : `Versão ${v.id}`)
const msg = (e: unknown) => (e instanceof PastoralApiError ? e.pastoralMessage : "Algo não saiu como o esperado. Tente novamente.")

export default function PromptEditorPage() {
  const { fetchApi } = useApi()
  const [versoes, setVersoes] = useState<Versao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [conteudo, setConteudo] = useState<Conteudo>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [confirmar, setConfirmar] = useState<Versao | null>(null)
  const [previa, setPrevia] = useState<Versao | null>(null)
  const [exemplo, setExemplo] = useState({ nome: "Maria", pedidoOracao: "Peço oração pela minha família." })
  const [gerando, setGerando] = useState(false)
  const [resultado, setResultado] = useState<{ oracao?: string; erro?: string } | null>(null)

  const carregar = useCallback(async () => {
    try {
      const lista = await fetchApi<Versao[]>("/api/admin/prompts", { showToast: false })
      // Padrão no topo; as demais da mais nova para a mais antiga (ordem do servidor).
      setVersoes([...lista.filter((v) => v.padrao), ...lista.filter((v) => !v.padrao)])
      setErro(null)
      return lista
    } catch (e) {
      setErro(msg(e))
      return []
    } finally {
      setCarregando(false)
    }
  }, [fetchApi])

  useEffect(() => {
    carregar().then((l) => {
      const base = l.find((v) => v.ativo) ?? l.find((v) => v.padrao)
      if (base?.conteudo) setConteudo(base.conteudo)
    })
  }, [carregar])

  const completo = CAMPOS.every((c) => (conteudo[c.chave] ?? "").trim())

  async function salvar() {
    setSalvando(true)
    try {
      await fetchApi("/api/admin/prompts", { method: "POST", body: JSON.stringify(conteudo), showToast: false })
      toast.success("Nova versão criada. Ela ainda não está ativa.")
      await carregar()
    } catch (e) {
      toast.error(msg(e))
    } finally {
      setSalvando(false)
    }
  }

  async function aplicar(v: Versao) {
    try {
      if (v.padrao) await fetchApi("/api/admin/prompts/ativacao", { method: "DELETE", showToast: false })
      else await fetchApi(`/api/admin/prompts/${v.id}/ativacao`, { method: "POST", showToast: false })
      toast.success(v.padrao ? "Voltamos ao prompt padrão." : `${rotulo(v)} ativada.`)
      setConfirmar(null)
      await carregar()
    } catch (e) {
      setConfirmar(null)
      toast.error(msg(e))
    }
  }

  async function gerarPrevia() {
    setGerando(true)
    setResultado(null)
    try {
      const r = await fetchApi<components["schemas"]["Previa"]>("/api/admin/prompts/previa", {
        method: "POST",
        body: JSON.stringify({ versaoId: previa?.id ?? null, ...exemplo }),
        showToast: false,
      })
      setResultado({ oracao: r.oracao })
    } catch (e) {
      setResultado({ erro: msg(e) }) // 503 (Claude indisponível) e 502 (resposta ruim) trazem a mensagem pastoral
    } finally {
      setGerando(false)
    }
  }

  if (carregando) return <LoadingSpinner />

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-serif text-clama-gold">Prompts da oração</h1>
      {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}

      <section className="space-y-3">
        {versoes.map((v) => (
          <div
            key={v.id ?? "padrao"}
            data-versao
            className={`rounded-lg border p-4 flex flex-wrap items-center gap-3 ${
              v.ativo ? "border-clama-gold bg-clama-gold/10" : "border-clama-gold/20"
            }`}
          >
            <span className="font-medium text-clama-cream">{rotulo(v)}</span>
            {v.ativo && <span className="text-xs text-clama-gold">Ativa</span>}
            {v.padrao && !versoes.some((x) => x.ativo) && <span className="text-xs text-clama-gold">Ativa (nenhuma versão ativada)</span>}
            {v.criadoEm && <span className="text-xs text-clama-cream/60">{new Date(v.criadoEm).toLocaleString("pt-BR")}</span>}
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => v.conteudo && setConteudo(v.conteudo)}>Editar a partir desta</Button>
              <Button size="sm" variant="ghost" onClick={() => { setResultado(null); setPrevia(v) }}>Prévia</Button>
              {!v.ativo && (
                <Button size="sm" onClick={() => setConfirmar(v)}>{v.padrao ? "Voltar ao padrão" : "Ativar"}</Button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg text-clama-gold">Nova versão</h2>
        {CAMPOS.map((c) => (
          <div key={c.chave} className="space-y-1">
            <Label htmlFor={`campo-${c.chave}`}>{c.rotulo}</Label>
            {c.semUso && <p className="text-xs text-yellow-400/80">Não usado desde a v2</p>}
            <Textarea
              id={`campo-${c.chave}`}
              rows={c.linhas}
              maxLength={c.max}
              value={conteudo[c.chave] ?? ""}
              onChange={(e) => setConteudo({ ...conteudo, [c.chave]: e.target.value })}
            />
            <p className="text-xs text-clama-cream/50">{(conteudo[c.chave] ?? "").length}/{c.max}</p>
          </div>
        ))}
        <Button onClick={salvar} disabled={salvando || !completo}>Salvar nova versão</Button>
      </section>

      <Dialog open={!!confirmar} onOpenChange={() => setConfirmar(null)}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">{confirmar?.padrao ? "Voltar ao padrão" : "Ativar versão"}</DialogTitle>
            <DialogDescription className="text-clama-cream/60">
              {confirmar?.padrao
                ? "As próximas orações usarão o prompt que vem no código."
                : `As próximas orações usarão a ${confirmar && rotulo(confirmar)}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmar(null)}>Cancelar</Button>
            <Button className="flex-1" onClick={() => confirmar && aplicar(confirmar)}>
              {confirmar?.padrao ? "Voltar ao padrão" : "Ativar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previa} onOpenChange={() => setPrevia(null)}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">Prévia — {previa && rotulo(previa)}</DialogTitle>
            <DialogDescription className="text-clama-cream/60">Gera uma oração de teste (usa a Claude).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="previa-nome">Nome</Label>
            <Input id="previa-nome" maxLength={120} value={exemplo.nome} onChange={(e) => setExemplo({ ...exemplo, nome: e.target.value })} />
            <Label htmlFor="previa-pedido">Pedido de exemplo</Label>
            <Textarea id="previa-pedido" maxLength={2000} value={exemplo.pedidoOracao} onChange={(e) => setExemplo({ ...exemplo, pedidoOracao: e.target.value })} />
            <Button onClick={gerarPrevia} disabled={gerando}>{gerando ? "Gerando..." : "Gerar prévia"}</Button>
            {resultado?.oracao && <p className="whitespace-pre-wrap rounded border border-clama-gold/20 p-3">{resultado.oracao}</p>}
            {resultado?.erro && <PastoralAlert variant="error">{resultado.erro}</PastoralAlert>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

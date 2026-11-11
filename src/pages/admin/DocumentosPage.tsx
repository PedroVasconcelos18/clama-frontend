import { useCallback, useEffect, useState } from "react"
import { useApi } from "@/hooks/useApi"
import { PastoralApiError } from "@/lib/api"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import type { components } from "@/types/api-schema"

type Documento = components["schemas"]["DocumentoAdmin"]

const MAX_BYTES = 32 * 1024 * 1024
const TIPOS: Record<string, string> = { "application/pdf": "PDF", "text/plain": "TXT" }

const msg = (e: unknown) => (e instanceof PastoralApiError ? e.pastoralMessage : "Algo não saiu como o esperado. Tente novamente.")

const tamanho = (b?: number | null) =>
  b == null ? "—" : b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${(b / 1024).toFixed(1).replace(".", ",")} KB`

/** Content-Type a enviar: a extensão decide (o navegador reporta `x-pdf` etc.); `type` só se não houver .pdf/.txt. O backend confere o formato pelo conteúdo. */
function tipoDe(f: File): string | null {
  if (/\.pdf$/i.test(f.name)) return "application/pdf"
  if (/\.txt$/i.test(f.name)) return "text/plain"
  return TIPOS[f.type] ? f.type : null
}

function validar(f: File): string | null {
  if (!tipoDe(f)) return "Envie um arquivo PDF ou TXT."
  if (f.size > MAX_BYTES) return "O arquivo passa de 32 MB."
  return null
}

export default function DocumentosPage() {
  const { fetchApi } = useApi()
  const [docs, setDocs] = useState<Documento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [novo, setNovo] = useState(false)
  const [nome, setNome] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [renomear, setRenomear] = useState<Documento | null>(null)
  const [remover, setRemover] = useState<Documento | null>(null)
  const [novoNome, setNovoNome] = useState("")

  const carregar = useCallback(async () => {
    try {
      setDocs(await fetchApi<Documento[]>("/api/admin/documentos", { showToast: false }))
      setErro(null)
    } catch (e) {
      setErro(msg(e))
    } finally {
      setCarregando(false)
    }
  }, [fetchApi])

  useEffect(() => { carregar() }, [carregar])

  // Corpo cru (File) com o Content-Type do arquivo: o fetchApi só põe JSON quando o header não vem.
  const enviarArquivo = (id: number, f: File) =>
    fetchApi<Documento>(`/api/admin/documentos/${id}/arquivo`, {
      method: "PUT", body: f, headers: { "Content-Type": tipoDe(f)! }, showToast: false,
    })

  async function criarEEnviar() {
    if (!nome.trim()) return setErroArquivo("Dê um nome ao documento.")
    if (!arquivo) return setErroArquivo("Escolha um arquivo PDF ou TXT.")
    const invalido = validar(arquivo)
    if (invalido) return setErroArquivo(invalido)
    setEnviando(true)
    try {
      const criado = await fetchApi<Documento>("/api/admin/documentos", { method: "POST", body: JSON.stringify({ nome: nome.trim() }), showToast: false })
      try {
        await enviarArquivo(criado.id!, arquivo)
        toast.success("Documento enviado.")
      } catch (e) {
        // Metadados criados, arquivo não: a linha fica na lista e o envio se refaz por ela.
        toast.error(msg(e))
      }
      setNovo(false); setNome(""); setArquivo(null)
      await carregar()
    } catch (e) {
      toast.error(msg(e))
    } finally {
      setEnviando(false)
    }
  }

  async function reenviar(d: Documento, f: File | undefined) {
    if (!f) return
    const invalido = validar(f)
    if (invalido) return void toast.error(invalido)
    setEnviando(true)
    try {
      await enviarArquivo(d.id!, f)
      toast.success("Arquivo enviado.")
      await carregar()
    } catch (e) {
      toast.error(msg(e))
    } finally {
      setEnviando(false)
    }
  }

  /** true se deu certo; em falha mostra o toast e devolve false (o diálogo fica aberto). */
  async function acao(fn: () => Promise<unknown>): Promise<boolean> {
    try {
      await fn()
      await carregar()
      return true
    } catch (e) {
      toast.error(msg(e))
      return false
    }
  }

  const mudar = (d: Documento, corpo: object) =>
    acao(() => fetchApi(`/api/admin/documentos/${d.id}`, { method: "PATCH", body: JSON.stringify(corpo), showToast: false }))

  if (carregando) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-clama-gold">Documentos de contexto</h1>
        <Button onClick={() => { setErroArquivo(null); setNovo(true) }}>Novo</Button>
      </div>
      {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}

      <table className="w-full text-sm text-clama-cream">
        <thead className="text-left text-clama-gold">
          <tr><th>Nome</th><th>Tipo</th><th>Tamanho</th><th>Status</th><th>Criado em</th><th /></tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-t border-clama-gold/10">
              <td className="py-2">{d.nome}</td>
              <td>{(d.mime && TIPOS[d.mime]) ?? "—"}</td>
              <td>{tamanho(d.tamanhoBytes)}</td>
              <td>{d.fileId ? (d.ativo ? "Ativo" : "Inativo") : "Sem arquivo"}</td>
              <td>{d.criadoEm ? new Date(d.criadoEm).toLocaleDateString("pt-BR") : ""}</td>
              <td className="flex flex-wrap justify-end gap-1 py-2">
                {d.fileId && <Button size="sm" variant="ghost" onClick={() => mudar(d, { ativo: !d.ativo })}>{d.ativo ? "Desativar" : "Ativar"}</Button>}
                <Button size="sm" variant="ghost" onClick={() => { setNovoNome(d.nome ?? ""); setRenomear(d) }}>Renomear</Button>
                <Label className="inline-flex cursor-pointer items-center rounded px-2 text-xs text-clama-cream/70 hover:text-clama-cream">
                  {d.fileId ? "Substituir arquivo" : "Enviar arquivo"}
                  <input type="file" accept=".pdf,.txt" className="sr-only" disabled={enviando}
                    onChange={(e) => { reenviar(d, e.target.files?.[0]); e.target.value = "" }} />
                </Label>
                <Button size="sm" variant="ghost" onClick={() => setRemover(d)}>Remover</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {enviando && !novo && <p className="text-sm text-clama-cream/70">Enviando arquivo...</p>}

      <Dialog open={novo} onOpenChange={(o) => !enviando && setNovo(o)}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">Novo documento</DialogTitle>
            <DialogDescription className="text-clama-cream/60">PDF ou TXT, até 32 MB.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="doc-nome">Nome</Label>
            <Input id="doc-nome" maxLength={200} value={nome} onChange={(e) => setNome(e.target.value)} />
            <Label htmlFor="doc-arquivo">Arquivo</Label>
            <input id="doc-arquivo" type="file" accept=".pdf,.txt" onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); setErroArquivo(null) }} />
            {erroArquivo && <PastoralAlert variant="error">{erroArquivo}</PastoralAlert>}
            {enviando && <p className="text-sm">Enviando... isso pode levar alguns minutos para arquivos grandes.</p>}
            <Button onClick={criarEEnviar} disabled={enviando}>Enviar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renomear} onOpenChange={() => setRenomear(null)}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader><DialogTitle className="text-clama-gold">Renomear</DialogTitle><DialogDescription className="sr-only">Novo nome</DialogDescription></DialogHeader>
          <Label htmlFor="doc-renomear">Novo nome</Label>
          <Input id="doc-renomear" maxLength={200} value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
          <Button disabled={!novoNome.trim()} onClick={() => renomear && mudar(renomear, { nome: novoNome.trim() }).then((ok) => ok && setRenomear(null))}>Salvar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!remover} onOpenChange={() => setRemover(null)}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">Remover documento</DialogTitle>
            <DialogDescription className="text-clama-cream/60">Remover "{remover?.nome}"? O arquivo também sai da Anthropic.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setRemover(null)}>Cancelar</Button>
            <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              onClick={() => remover && acao(() => fetchApi(`/api/admin/documentos/${remover.id}`, { method: "DELETE", showToast: false })).then((ok) => ok && setRemover(null))}>
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState } from "react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"

import { useApi } from "@/hooks/useApi"
import { useSessao } from "@/contexts/SessaoContext"
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
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { csrfHeaders } from "@/lib/csrf"
import { extractErrorMessage } from "@/lib/erros"
import type { components } from "@/types/api-schema"

type Previa = components["schemas"]["PreviaDoTitular"]
type Resultado = components["schemas"]["ResultadoDaExclusao"]
type BlogApagado = components["schemas"]["BlogApagado"]
type Dialogo = "excluir" | "blog" | null

const BASE = import.meta.env.VITE_API_URL ?? ""
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/**
 * LGPD: busca por e-mail, prévia, exportação (JSON) e exclusão. O e-mail vai sempre no corpo de um POST,
 * nunca na URL; quem vem da ficha do usuário traz o e-mail pelo state do router.
 */
export default function LgpdPage() {
  const { fetchApi } = useApi()
  const { usuario } = useSessao()
  const souSuperusuario = usuario?.papel === "SUPERUSUARIO"
  const location = useLocation()
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? "")
  // o e-mail da busca: exportar e excluir valem para ele, mesmo que o campo seja editado depois
  const [buscado, setBuscado] = useState("")
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [digitado, setDigitado] = useState("")
  const [erroDialogo, setErroDialogo] = useState<string | null>(null)

  const post = <T,>(rota: string, corpo: object) =>
    fetchApi<T>(`/api/admin/lgpd/${rota}`, { method: "POST", body: JSON.stringify(corpo), showToast: false })
  const mensagem = (e: unknown, padrao: string) => (e as { pastoralMessage?: string })?.pastoralMessage ?? padrao

  async function buscar() {
    const alvo = email.trim()
    if (!alvo) return
    setBusy(true)
    setErro(null)
    setAviso(null)
    try {
      setPrevia(await post<Previa>("busca", { email: alvo }))
      setBuscado(alvo)
    } catch (e) {
      setPrevia(null)
      setErro(mensagem(e, "Não foi possível buscar."))
    } finally {
      setBusy(false)
    }
  }

  async function exportar() {
    setErro(null)
    try {
      // POST com download: fetch + Blob (um <a href> seria GET, e o e-mail iria para a URL)
      const r = await fetch(`${BASE}/api/admin/lgpd/exportacao`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...csrfHeaders("POST") },
        body: JSON.stringify({ email: buscado }),
      })
      if (!r.ok) {
        setErro(extractErrorMessage(await r.json().catch(() => null)))
        return
      }
      const nome = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "lgpd.json"
      const url = URL.createObjectURL(await r.blob())
      const a = document.createElement("a")
      a.href = url
      a.download = nome
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setErro("Não foi possível exportar.")
    }
  }

  function abrir(d: Dialogo) {
    setDigitado("")
    setErroDialogo(null)
    setDialogo(d)
  }

  const confere = digitado.trim().toLowerCase() === buscado.toLowerCase()

  async function confirmar() {
    if (!previa || !confere) return
    setBusy(true)
    setErroDialogo(null)
    try {
      if (dialogo === "excluir") {
        const r = await post<Resultado>("exclusao", {
          email: buscado, confirmacao: digitado.trim(), pedidoIds: previa.pedidoIds ?? [], contaIds: previa.contaIds ?? [],
        })
        setAviso(
          `Dados excluídos: ${plural(r.pedidosApagados ?? 0, "pedido apagado", "pedidos apagados")}, ` +
            `${plural(r.pedidosAnonimizados ?? 0, "anonimizado", "anonimizados")}, ` +
            `${plural(r.contasExcluidas ?? 0, "conta excluída", "contas excluídas")}.`,
        )
        setPrevia(null)
      } else {
        const r = await post<BlogApagado>("exclusao-do-blog", { email: buscado, confirmacao: digitado.trim() })
        setDialogo(null)
        await buscar() // atualiza a prévia (o aviso vem depois: buscar() o limpa)
        setAviso(`Blog apagado: ${plural(r.comentarios ?? 0, "comentário", "comentários")} e ${plural(r.curtidas ?? 0, "curtida", "curtidas")}.`)
      }
      setDialogo(null)
    } catch (e) {
      const m = mensagem(e, "Não foi possível concluir.")
      if ((e as { httpStatus?: number })?.httpStatus === 409) {
        // o titular mudou desde a busca: a prévia não vale mais
        setDialogo(null)
        setPrevia(null)
        setErro(`${m} Faça uma nova busca para ver os números atuais.`)
      } else {
        setErroDialogo(m)
        toast.error(m)
      }
    } finally {
      setBusy(false)
    }
  }

  const p = previa?.pedidos
  const b = previa?.blog
  const nada = !!previa && !(previa.contaIds?.length) && !(previa.pedidoIds?.length) && !b?.comentarios && !b?.curtidas && !b?.banido
  const temConta = !!previa?.contas?.length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl text-clama-gold">Dados do titular (LGPD)</h1>
        <p className="text-sm text-clama-cream/60">Busque pelo e-mail para ver o que existe, exportar ou excluir.</p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-3"
        onSubmit={(ev) => {
          ev.preventDefault()
          void buscar()
        }}
      >
        <div className="grow max-w-md">
          <Label htmlFor="lgpd-email" className="text-xs uppercase tracking-wider text-clama-gold/80">E-mail do titular</Label>
          <Input id="lgpd-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy || !email.trim()}>Buscar</Button>
      </form>

      {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
      {aviso && <PastoralAlert variant="success">{aviso}</PastoralAlert>}

      {previa && (
        <section className="space-y-3 rounded-md border border-clama-gold/15 bg-clama-night-deep p-4" aria-label="Prévia">
          {nada ? (
            <p className="text-clama-cream">Não encontramos dados para {buscado}.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-clama-cream">
              <li>{plural(p?.aApagar ?? 0, "pedido será apagado", "pedidos serão apagados")}</li>
              <li>
                {(p?.aAnonimizar ?? 0) === 1
                  ? "1 pedido será anonimizado (tem pagamento)"
                  : `${p?.aAnonimizar ?? 0} pedidos serão anonimizados (têm pagamento)`}
                : ficam como registro contábil, sem os dados pessoais
              </li>
              <li>{plural(previa.contaIds?.length ?? 0, "conta será excluída", "contas serão excluídas")}</li>
              <li>
                {plural(b?.comentarios ?? 0, "comentário apagado", "comentários apagados")} e{" "}
                {plural(b?.curtidas ?? 0, "curtida apagada", "curtidas apagadas")}
              </li>
              {b?.banido && <li>O banimento do blog fica registrado.</li>}
              {previa.freemiumBloqueado && <li>O bloqueio do freemium fica.</li>}
            </ul>
          )}
          {(p?.emProcessamento ?? 0) > 0 && (
            <PastoralAlert variant="info">
              {plural(p!.emProcessamento!, "pedido está em processamento", "pedidos estão em processamento")}: a exclusão só é aceita quando terminarem.
            </PastoralAlert>
          )}
          {!nada && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={() => void exportar()}>Exportar dados (JSON)</Button>
              {temConta && (
                <Button variant="outline" onClick={() => abrir("blog")}>Apagar só o blog</Button>
              )}
              {souSuperusuario && (
                <Button
                  variant="outline"
                  onClick={() => abrir("excluir")}
                  className="border-red-400/40 text-red-300 hover:bg-red-400/10"
                >
                  Excluir dados
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      <Dialog open={dialogo !== null} onOpenChange={(o) => !o && !busy && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogo === "excluir" ? "Excluir dados do titular?" : "Apagar só o blog?"}</DialogTitle>
            <DialogDescription>
              {dialogo === "excluir"
                ? "Isto não tem volta: pedidos sem pagamento e contas são apagados; os com pagamento são anonimizados."
                : "Comentários e curtidas deste titular são apagados. A conta e os pedidos ficam."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="lgpd-confirma">
              Digite <strong>{buscado}</strong> para confirmar
            </Label>
            <Input id="lgpd-confirma" value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
          </div>
          {erroDialogo && <PastoralAlert variant="error">{erroDialogo}</PastoralAlert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)} disabled={busy}>Cancelar</Button>
            <Button
              onClick={() => void confirmar()}
              disabled={busy || !confere}
              className="bg-red-500/80 text-white hover:bg-red-500"
            >
              {busy ? "Aguarde…" : dialogo === "excluir" ? "Excluir dados" : "Apagar o blog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

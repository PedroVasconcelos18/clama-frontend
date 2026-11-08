import { useState } from "react"
import { toast } from "sonner"
import { useApi } from "@/hooks/useApi"
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

/** Criar admin: POST /api/admin/usuarios. O front compara as duas senhas; o resto o servidor valida. */
export function NovoAdminDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { fetchApi } = useApi()
  const [email, setEmail] = useState("")
  const [nome, setNome] = useState("")
  const [senha, setSenha] = useState("")
  const [confirma, setConfirma] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // todo fechamento (cancelar, Esc, sucesso) limpa tudo, inclusive a senha
  function fechar() {
    setEmail("")
    setNome("")
    setSenha("")
    setConfirma("")
    setErro(null)
    onClose()
  }

  const ok = email.trim() !== "" && senha !== "" && senha === confirma

  async function criar() {
    setBusy(true)
    setErro(null)
    try {
      await fetchApi("/api/admin/usuarios", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), nomeCompleto: nome.trim(), senha }),
        showToast: false,
      })
      toast.success(`Admin ${email.trim()} criado.`)
      onCreated()
      fechar()
    } catch (err) {
      const msg = (err as { pastoralMessage?: string })?.pastoralMessage ?? "Não foi possível criar o admin."
      setErro(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo admin</DialogTitle>
          <DialogDescription>
            A pessoa passa a acessar todo o painel. Quem já tem conta não é criada de novo: promova a conta existente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="novo-email">E-mail</Label>
          <Input id="novo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Label htmlFor="novo-nome">Nome completo</Label>
          <Input id="novo-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Label htmlFor="novo-senha">Senha</Label>
          <Input
            id="novo-senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <Label htmlFor="novo-senha2">Confirmar senha</Label>
          <Input
            id="novo-senha2"
            type="password"
            autoComplete="new-password"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
          />
          {confirma && senha !== confirma && <p className="text-xs text-red-300">As senhas não conferem.</p>}
        </div>
        {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
        <DialogFooter>
          <Button variant="outline" onClick={fechar} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={criar} disabled={busy || !ok}>
            {busy ? "Criando…" : "Criar admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

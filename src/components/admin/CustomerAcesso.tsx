import { useState } from "react"
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
import type { UsuarioAdmin } from "@/types/usuario-admin"

type Acao = "admin" | "ativo" | "senha" | "excluir"

/**
 * Seção "Acesso" do drawer. O drawer só a mostra a SUPERUSUARIO (o servidor também recusa os demais com 403).
 * Toda ação passa por um Dialog de confirmação.
 */
export function CustomerAcesso({
  customer,
  onChanged,
  onDeleted,
}: {
  customer: UsuarioAdmin
  /** Depois de PATCH ou senha: o drawer e a lista recarregam. */
  onChanged: () => void
  onDeleted: () => void
}) {
  const { fetchApi } = useApi()
  const { usuario } = useSessao()
  const propria = usuario != null && usuario.id === customer.id
  const ehAdmin = customer.papel === "ADMIN"

  const [acao, setAcao] = useState<Acao | null>(null)
  const [senha, setSenha] = useState("")
  const [confirma, setConfirma] = useState("")
  const [emailDigitado, setEmailDigitado] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // todo caminho de fechamento (cancelar, Esc, sucesso) passa por aqui: senha não fica em estado
  function fechar() {
    setAcao(null)
    setSenha("")
    setConfirma("")
    setEmailDigitado("")
  }

  function abrir(a: Acao) {
    setSenha("")
    setConfirma("")
    setEmailDigitado("")
    setErro(null)
    setAcao(a)
  }

  async function executar(fn: () => Promise<void>) {
    setBusy(true)
    setErro(null)
    try {
      await fn()
      fechar()
    } catch (err) {
      const msg = (err as { pastoralMessage?: string })?.pastoralMessage ?? "Não foi possível concluir a ação."
      setErro(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const url = `/api/admin/usuarios/${customer.id}`
  const patch = (corpo: { papel?: string; ativo?: boolean }, ok: string) =>
    executar(async () => {
      await fetchApi(url, { method: "PATCH", body: JSON.stringify(corpo), showToast: false })
      toast.success(ok)
      onChanged()
    })

  const senhaOk = senha.length > 0 && senha === confirma
  const emailOk = emailDigitado.trim().toLowerCase() === customer.email.toLowerCase()

  return (
    <section>
      <h3 className="font-sans text-xs font-bold tracking-[2px] uppercase text-clama-gold mb-2">Acesso</h3>
      {propria && (
        <p className="mb-2 text-xs text-clama-cream/60">Esta é a sua conta: o acesso dela só outro superusuário muda.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {customer.papel !== "SUPERUSUARIO" && (
          <Button variant="outline" size="sm" disabled={propria} onClick={() => abrir("admin")}>
            {ehAdmin ? "Remover admin" : "Tornar admin"}
          </Button>
        )}
        <Button variant="outline" size="sm" disabled={propria} onClick={() => abrir("ativo")}>
          {customer.ativo ? "Desativar conta" : "Reativar"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => abrir("senha")}>
          Definir senha
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={propria}
          onClick={() => abrir("excluir")}
          className="border-red-400/40 text-red-300 hover:bg-red-400/10"
        >
          Excluir usuário
        </Button>
      </div>

      <Dialog open={acao !== null} onOpenChange={(o) => !o && !busy && fechar()}>
        <DialogContent>
          {acao === "admin" && (
            <>
              <DialogHeader>
                <DialogTitle>{ehAdmin ? "Remover admin?" : "Tornar admin?"}</DialogTitle>
                <DialogDescription>
                  {ehAdmin
                    ? `${customer.email} perde o acesso ao painel e as sessões dela são encerradas.`
                    : `${customer.email} passa a acessar todo o painel admin.`}
                </DialogDescription>
              </DialogHeader>
              {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
              <Rodape
                busy={busy}
                onCancel={fechar}
                label={ehAdmin ? "Remover admin" : "Tornar admin"}
                onOk={() =>
                  patch(
                    { papel: ehAdmin ? "CLIENTE" : "ADMIN" },
                    ehAdmin ? "Admin removido." : "Agora é admin.",
                  )
                }
              />
            </>
          )}

          {acao === "ativo" && (
            <>
              <DialogHeader>
                <DialogTitle>{customer.ativo ? "Desativar conta?" : "Reativar conta?"}</DialogTitle>
                <DialogDescription>
                  {customer.ativo
                    ? `${customer.email} não consegue mais entrar e as sessões dela são encerradas.`
                    : `${customer.email} volta a poder entrar.`}
                </DialogDescription>
              </DialogHeader>
              {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
              <Rodape
                busy={busy}
                onCancel={fechar}
                label={customer.ativo ? "Desativar conta" : "Reativar"}
                onOk={() =>
                  patch(
                    { ativo: !customer.ativo },
                    customer.ativo ? "Conta desativada." : "Conta reativada.",
                  )
                }
              />
            </>
          )}

          {acao === "senha" && (
            <>
              <DialogHeader>
                <DialogTitle>Definir senha</DialogTitle>
                <DialogDescription>
                  A senha atual de {customer.email} se perde e as sessões dela são encerradas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="acesso-senha">Nova senha</Label>
                <Input
                  id="acesso-senha"
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <Label htmlFor="acesso-senha2">Confirmar senha</Label>
                <Input
                  id="acesso-senha2"
                  type="password"
                  autoComplete="new-password"
                  value={confirma}
                  onChange={(e) => setConfirma(e.target.value)}
                />
                {confirma && senha !== confirma && (
                  <p className="text-xs text-red-300">As senhas não conferem.</p>
                )}
              </div>
              {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
              <Rodape
                busy={busy}
                disabled={!senhaOk}
                onCancel={fechar}
                label="Definir senha"
                onOk={() =>
                  executar(async () => {
                    await fetchApi(`${url}/senha`, {
                      method: "POST",
                      body: JSON.stringify({ senha }),
                      showToast: false,
                    })
                    toast.success("Senha definida — a pessoa precisa entrar de novo.")
                    onChanged()
                  })
                }
              />
            </>
          )}

          {acao === "excluir" && (
            <>
              <DialogHeader>
                <DialogTitle>Excluir usuário?</DialogTitle>
                <DialogDescription>
                  Isto não tem volta: a conta e as sessões dela deixam de existir.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="acesso-email">
                  Digite <strong>{customer.email}</strong> para confirmar
                </Label>
                <Input
                  id="acesso-email"
                  value={emailDigitado}
                  onChange={(e) => setEmailDigitado(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {erro && <PastoralAlert variant="error">{erro}</PastoralAlert>}
              <Rodape
                busy={busy}
                disabled={!emailOk}
                danger
                onCancel={fechar}
                label="Excluir usuário"
                onOk={() =>
                  executar(async () => {
                    await fetchApi(url, { method: "DELETE", showToast: false })
                    toast.success(`${customer.email} excluído.`)
                    onDeleted()
                  })
                }
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Rodape({
  busy,
  disabled,
  danger,
  label,
  onCancel,
  onOk,
}: {
  busy: boolean
  disabled?: boolean
  danger?: boolean
  label: string
  onCancel: () => void
  onOk: () => void
}) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={onCancel} disabled={busy}>
        Cancelar
      </Button>
      <Button
        onClick={onOk}
        disabled={busy || disabled}
        className={danger ? "bg-red-500/80 text-white hover:bg-red-500" : undefined}
      >
        {busy ? "Aguarde…" : label}
      </Button>
    </DialogFooter>
  )
}

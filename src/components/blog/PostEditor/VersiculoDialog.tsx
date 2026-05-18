import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type VersiculoDialogProps = {
  open: boolean
  onCancel: () => void
  onConfirm: (args: {
    texto: string
    referencia: string
    versao: string
  }) => void
}

export function VersiculoDialog({
  open,
  onCancel,
  onConfirm,
}: VersiculoDialogProps) {
  const [texto, setTexto] = useState("")
  const [referencia, setReferencia] = useState("")
  const [versao, setVersao] = useState("ARC")
  const [errors, setErrors] = useState<{
    texto?: string
    referencia?: string
  }>({})

  useEffect(() => {
    if (open) {
      setTexto("")
      setReferencia("")
      setVersao("ARC")
      setErrors({})
    }
  }, [open])

  function handleConfirm() {
    const nextErrors: typeof errors = {}
    if (!texto.trim()) {
      nextErrors.texto = "Texto do versículo é obrigatório"
    }
    if (!referencia.trim()) {
      nextErrors.referencia = "Referência é obrigatória (ex: João 3:16)"
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onConfirm({
      texto: texto.trim(),
      referencia: referencia.trim(),
      versao: versao.trim() || "ARC",
    })
    setTexto("")
    setReferencia("")
    setVersao("ARC")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inserir versículo destacado</DialogTitle>
          <DialogDescription>
            Aparece como bloco dourado-escuro no post.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="versiculo-texto">Texto do versículo</Label>
            <Textarea
              id="versiculo-texto"
              placeholder="Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-invalid={errors.texto ? true : undefined}
              rows={4}
            />
            {errors.texto && (
              <p className="text-sm text-destructive">{errors.texto}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="versiculo-ref">Referência</Label>
            <Input
              id="versiculo-ref"
              placeholder="João 3:16"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              aria-invalid={errors.referencia ? true : undefined}
            />
            {errors.referencia && (
              <p className="text-sm text-destructive">{errors.referencia}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="versiculo-versao">Versão (default ARC)</Label>
            <Input
              id="versiculo-versao"
              placeholder="ARC, NVI, ACF…"
              value={versao}
              onChange={(e) => setVersao(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Inserir versículo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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

export type ImageUrlDialogProps = {
  open: boolean
  onCancel: () => void
  onConfirm: (args: { src: string; alt: string }) => void
}

const URL_PATTERN = /^https?:\/\/.+/

export function ImageUrlDialog({
  open,
  onCancel,
  onConfirm,
}: ImageUrlDialogProps) {
  const [src, setSrc] = useState("")
  const [alt, setAlt] = useState("")
  const [errors, setErrors] = useState<{ src?: string; alt?: string }>({})

  useEffect(() => {
    if (open) {
      setSrc("")
      setAlt("")
      setErrors({})
    }
  }, [open])

  function handleConfirm() {
    const nextErrors: typeof errors = {}
    if (!URL_PATTERN.test(src.trim())) {
      nextErrors.src = "URL precisa começar com http:// ou https://"
    }
    if (!alt.trim()) {
      nextErrors.alt = "Texto alternativo é obrigatório (acessibilidade)"
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onConfirm({ src: src.trim(), alt: alt.trim() })
    setSrc("")
    setAlt("")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inserir imagem por URL</DialogTitle>
          <DialogDescription>
            Toda imagem precisa de texto alternativo para leitores de tela.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="image-url-src">URL da imagem</Label>
            <Input
              id="image-url-src"
              type="url"
              placeholder="https://"
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              aria-invalid={errors.src ? true : undefined}
            />
            {errors.src && (
              <p className="text-sm text-destructive">{errors.src}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="image-url-alt">
              Descrição (alt) <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="image-url-alt"
              type="text"
              placeholder="Descreva a imagem em uma frase"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              aria-invalid={errors.alt ? true : undefined}
            />
            {errors.alt && (
              <p className="text-sm text-destructive">{errors.alt}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Inserir imagem</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

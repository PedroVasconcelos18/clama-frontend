import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type LinkDialogProps = {
  open: boolean
  initialUrl?: string
  onCancel: () => void
  onConfirm: (url: string) => void
  onRemove?: () => void
}

const URL_PATTERN = /^https?:\/\/.+/

export function LinkDialog({
  open,
  initialUrl = "",
  onCancel,
  onConfirm,
  onRemove,
}: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl)
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    const trimmed = url.trim()
    if (!URL_PATTERN.test(trimmed)) {
      setError("Link precisa começar com http:// ou https://")
      return
    }
    setError(null)
    onConfirm(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inserir link</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="link-url">URL</Label>
          <Input
            id="link-url"
            type="url"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          {initialUrl && onRemove && (
            <Button variant="destructive" onClick={onRemove}>
              Remover link
            </Button>
          )}
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

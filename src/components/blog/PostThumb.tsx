import { cn } from "@/lib/utils"

export type PostThumbProps = {
  imagemCapaUrl?: string
  alt?: string
  className?: string
}

/**
 * Imagem de capa do post. Só renderiza quando há `imagem_capa_url` real —
 * sem placeholder/glow decorativo (decisão de produto: imagem vazia fica
 * solta, então o consumidor deve omitir a área inteira via `hasCapa`).
 */
export function hasCapa(imagemCapaUrl?: string): boolean {
  return Boolean(imagemCapaUrl && imagemCapaUrl.trim())
}

export function PostThumb({
  imagemCapaUrl,
  alt = "",
  className,
}: PostThumbProps) {
  if (!hasCapa(imagemCapaUrl)) return null
  return (
    <img
      src={imagemCapaUrl}
      alt={alt}
      loading="lazy"
      className={cn("h-full w-full object-cover", className)}
    />
  )
}

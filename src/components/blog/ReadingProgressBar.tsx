import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export type ReadingProgressBarProps = {
  /** Selector do elemento que define o "documento lido". Default: window. */
  targetSelector?: string
  className?: string
}

function computeProgress(target: HTMLElement | null): number {
  const scrollTop =
    target?.scrollTop ?? window.scrollY ?? document.documentElement.scrollTop
  const docHeight = target
    ? target.scrollHeight - target.clientHeight
    : document.documentElement.scrollHeight - window.innerHeight
  if (docHeight <= 0) return 0
  const pct = (scrollTop / docHeight) * 100
  return Math.min(100, Math.max(0, pct))
}

export function ReadingProgressBar({
  targetSelector,
  className,
}: ReadingProgressBarProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const target = targetSelector
      ? document.querySelector<HTMLElement>(targetSelector)
      : null
    const scrollSource: Window | HTMLElement = target ?? window

    let pending = false
    function update() {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        setProgress(computeProgress(target))
        pending = false
      })
    }

    update()
    scrollSource.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      scrollSource.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [targetSelector])

  const rounded = Math.round(progress)

  return (
    <div
      role="progressbar"
      aria-label="Progresso de leitura"
      aria-valuenow={rounded}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "fixed top-0 left-0 z-50 h-[2px] w-full bg-transparent md:h-[2px]",
        className,
      )}
    >
      <div
        className={cn(
          "h-full bg-clama-gold motion-safe:transition-[width] motion-safe:duration-75 motion-safe:ease-out",
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

import type { ReactNode } from "react"
import { Info, AlertCircle, CheckCircle2 } from "lucide-react"

interface PastoralAlertProps {
  variant: "info" | "error" | "success"
  children: ReactNode
  className?: string
}

const VARIANTS = {
  info: { Icon: Info, color: "text-clama-gold" },
  error: { Icon: AlertCircle, color: "text-red-400" },
  success: { Icon: CheckCircle2, color: "text-emerald-400" },
}

export function PastoralAlert({
  variant,
  children,
  className = "",
}: PastoralAlertProps) {
  const { Icon, color } = VARIANTS[variant]
  return (
    <div
      role="alert"
      className={`flex gap-3 items-start border border-clama-gold/40 bg-clama-night-soft rounded-md p-4 ${className}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} aria-hidden="true" />
      <div className="text-clama-cream font-sans text-sm">{children}</div>
    </div>
  )
}

export default PastoralAlert

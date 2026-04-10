interface LoadingSpinnerProps {
  size?: number
  className?: string
}

export function LoadingSpinner({
  size = 24,
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin motion-reduce:animate-none stroke-clama-gold"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="40 20"
        />
      </svg>
      <span className="sr-only">Carregando…</span>
    </div>
  )
}

export default LoadingSpinner

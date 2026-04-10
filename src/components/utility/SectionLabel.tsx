interface SectionLabelProps {
  children: string
  className?: string
}

export function SectionLabel({
  children,
  className = "",
}: SectionLabelProps) {
  return (
    <span
      className={`font-sans text-xs uppercase tracking-[3px] text-clama-gold ${className}`}
    >
      {children}
    </span>
  )
}

export default SectionLabel

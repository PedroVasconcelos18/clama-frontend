interface DividerProps {
  className?: string
  /** "light" (default) preserva o visual da LP; "dark" usa borda dourada. */
  theme?: "light" | "dark"
}

export function Divider({ className = "", theme = "light" }: DividerProps) {
  const borderColor =
    theme === "dark" ? "border-clama-gold/12" : "border-[#f0eaf8]"
  return (
    <hr
      className={`border-none border-t ${borderColor} my-6 ${className}`}
    />
  )
}

export default Divider

interface DividerProps {
  className?: string
}

export function Divider({ className = "" }: DividerProps) {
  return <hr className={`border-none border-t border-[#f0eaf8] my-6 ${className}`} />
}

export default Divider

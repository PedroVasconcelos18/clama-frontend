import type { ReactNode } from "react"
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext"
import "@/styles/index.css"

// Site é dark-only — força classe .dark no <html> pra que CSS vars do shadcn
// (bg-background, bg-input, etc) usem os valores dark definidos em
// styles/index.css. Roda em SSR via render server-side (Vike injeta o atributo
// no HTML inicial) e no client como fallback idempotente.
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark")
}

export default function Layout({ children }: { children: ReactNode }) {
  return <CustomerAuthProvider>{children}</CustomerAuthProvider>
}

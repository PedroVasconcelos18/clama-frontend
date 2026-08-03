import type { ReactNode } from "react"
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext"
import "@/styles/index.css"
import { purgeLegacyTokens } from "@/lib/purgeLegacyTokens"

// Site é dark-only — força classe .dark no <html> pra que CSS vars do shadcn
// (bg-background, bg-input, etc) usem os valores dark definidos em
// styles/index.css. Roda em SSR via render server-side (Vike injeta o atributo
// no HTML inicial) e no client como fallback idempotente.
if (typeof document !== "undefined") {
  // Rotas do blog não montam o spa-fallback — a purga precisa cobrir os dois.
  purgeLegacyTokens()
  document.documentElement.classList.add("dark")
}

export default function Layout({ children }: { children: ReactNode }) {
  return <CustomerAuthProvider>{children}</CustomerAuthProvider>
}

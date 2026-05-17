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

// DEBUG: instala monkey-patch UMA vez no client pra capturar quem mexe na chave
// de auth. Loga setItem/removeItem com stack trace. Roda fora do React (módulo
// top-level) pra interceptar tudo, inclusive efeitos pré-mount e libs externas.
if (typeof window !== "undefined") {
  const w = window as unknown as { __authStorageSpyInstalled?: boolean }
  if (!w.__authStorageSpyInstalled) {
    w.__authStorageSpyInstalled = true
    const key = "clama:customer-auth"
    const origSet = localStorage.setItem.bind(localStorage)
    const origRemove = localStorage.removeItem.bind(localStorage)
    const origClear = localStorage.clear.bind(localStorage)
    localStorage.setItem = function (k: string, v: string) {
      if (k === key) {
        // eslint-disable-next-line no-console
        console.trace("[StorageSpy] setItem", k, v.slice(0, 60))
      }
      return origSet(k, v)
    }
    localStorage.removeItem = function (k: string) {
      if (k === key) {
        // eslint-disable-next-line no-console
        console.trace("[StorageSpy] removeItem", k)
      }
      return origRemove(k)
    }
    localStorage.clear = function () {
      // eslint-disable-next-line no-console
      console.trace("[StorageSpy] localStorage.clear() — wipes everything")
      return origClear()
    }
  }
}

export default function Layout({ children }: { children: ReactNode }) {
  return <CustomerAuthProvider>{children}</CustomerAuthProvider>
}

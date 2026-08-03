import { BrowserRouter } from "react-router-dom"
import App from "@/App"
import "@/styles/index.css"
import { detectLocale } from "@/i18n"
import { purgeLegacyTokens } from "@/lib/purgeLegacyTokens"

if (typeof window !== "undefined") {
  // Antes de qualquer render — os providers de auth leem o storage no
  // inicializador de `useState`, e um script de terceiro pode executar depois.
  purgeLegacyTokens()
  detectLocale()
}

export default function SpaShell() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

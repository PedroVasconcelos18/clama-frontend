import { BrowserRouter } from "react-router-dom"
import App from "@/App"
import "@/styles/index.css"
import { detectLocale } from "@/i18n"
import { purgeLegacyTokens } from "@/lib/purgeLegacyTokens"

if (typeof window !== "undefined") {
  // Antes de qualquer render: apaga o storage legado de auth.
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

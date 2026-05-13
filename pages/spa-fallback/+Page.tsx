import { BrowserRouter } from "react-router-dom"
import App from "@/App"
import "@/styles/index.css"
import { detectLocale } from "@/i18n"

if (typeof window !== "undefined") {
  detectLocale()
}

export default function SpaShell() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

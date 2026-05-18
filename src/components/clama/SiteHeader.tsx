import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useCustomerAuth } from "@/contexts/CustomerAuthContext"

export type SiteHeaderProps = {
  active: "blog" | "conta"
  /**
   * Callback opcional após logout completar. Default: full reload pra "/".
   * /conta passa `navigate("/")` pra manter SPA suave; /blog (Vike) usa default.
   */
  onAfterLogout?: () => void
}

export function SiteHeader({ active, onAfterLogout }: SiteHeaderProps) {
  const { user, isAuthenticated, isLoading, logout } = useCustomerAuth()

  // Mount-flag: server e primeira render cliente mostram chrome neutro
  // (sem nome / sem botão Sair) pra evitar hydration mismatch — auth state
  // só é confiável após hidratar do localStorage.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const primeiroNome =
    mounted && user?.nome_completo
      ? user.nome_completo.split(" ")[0]
      : null

  const handleLogout = useCallback(async () => {
    await logout()
    toast.success("Até logo. Que sua paz seja preservada.")
    if (onAfterLogout) {
      onAfterLogout()
    } else {
      window.location.href = "/"
    }
  }, [logout, onAfterLogout])

  const navLink = (
    href: string,
    label: string,
    isActive: boolean,
  ) => (
    <a
      href={href}
      className={
        isActive
          ? "font-sans text-[0.88rem] font-semibold text-clama-gold"
          : "font-sans text-[0.88rem] text-clama-cream/70 hover:text-clama-cream transition-colors"
      }
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </a>
  )

  return (
    <header className="border-b border-clama-gold/20 bg-clama-night">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
        <a
          href="/"
          className="font-serif text-clama-gold text-[1.4rem] font-bold tracking-wide"
        >
          Clama
        </a>

        <nav
          className="flex items-center gap-5"
          aria-label="Navegação principal"
        >
          {navLink("/blog", "Blog", active === "blog")}
          {navLink("/conta", "Conta", active === "conta")}

          {mounted && isAuthenticated && !isLoading && (
            <div className="flex items-center gap-3 pl-3 ml-1 border-l border-clama-gold/20">
              {primeiroNome && (
                <span
                  className="font-sans text-[0.88rem] text-clama-cream/80 hidden sm:inline"
                  aria-label={`Logada como ${primeiroNome}`}
                >
                  {primeiroNome}
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="font-sans text-[0.82rem] text-clama-cream/70 hover:text-clama-gold transition-colors"
              >
                Sair
              </button>
            </div>
          )}

          {mounted && !isAuthenticated && !isLoading && (
            <a
              href={`/login?next=${encodeURIComponent(
                active === "blog" ? "/blog" : "/conta",
              )}`}
              className="font-sans text-[0.82rem] text-clama-cream/70 hover:text-clama-gold transition-colors pl-3 ml-1 border-l border-clama-gold/20"
            >
              Entrar
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}

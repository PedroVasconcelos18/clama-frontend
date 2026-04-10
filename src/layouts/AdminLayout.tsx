import { useState } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  MessageSquare,
  Menu,
  X,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/pedidos", icon: FileText, label: "Pedidos" },
  { to: "/admin/planos", icon: CreditCard, label: "Planos" },
  { to: "/admin/prompts", icon: MessageSquare, label: "Prompts" },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate("/admin/login", { replace: true })
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-clama-night">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-clama-night-deep border-b border-clama-gold/20 px-4 h-14 flex items-center justify-between">
        <h1 className="font-serif text-clama-gold text-xl">Clama</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-clama-cream hover:bg-clama-gold/10"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar / Mobile Drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-60 bg-clama-night-deep border-r border-clama-gold/20 transition-transform duration-200",
          "lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-14 lg:h-16 flex items-center px-4 border-b border-clama-gold/20">
          <h1 className="font-serif text-clama-gold text-xl tracking-wide">Clama</h1>
          <span className="ml-2 text-clama-cream/40 text-xs">Admin</span>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans transition-colors",
                  isActive
                    ? "bg-clama-gold/10 text-clama-gold border-l-2 border-clama-gold"
                    : "text-clama-cream/70 hover:bg-clama-gold/5 hover:text-clama-cream"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-clama-gold/20">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="text-clama-cream/80 truncate">
                {user?.nome_completo || user?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              className="text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-clama-gold/10 bg-clama-night-deep/50">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-clama-cream/60 text-sm">
              {user?.nome_completo || user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

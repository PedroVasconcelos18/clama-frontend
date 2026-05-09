import { Routes, Route } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext"
import { ProtectedRoute } from "@/components/admin/ProtectedRoute"
import Landing from "@/pages/Landing"
import PedidoGratuito from "@/pages/PedidoGratuito"
import PedidoGratuitoConfirmar from "@/pages/PedidoGratuitoConfirmar"
import PedidoGratuitoConfirmado from "@/pages/PedidoGratuitoConfirmado"
import Confirmacao from "@/pages/Confirmacao"
import Cancelado from "@/pages/Cancelado"
import Privacidade from "@/pages/Privacidade"
import Termos from "@/pages/Termos"
import NotFound from "@/pages/NotFound"
import DevShowcase from "@/pages/_DevShowcase"
import HealthDebug from "@/pages/HealthDebug"
import Login from "@/pages/Login"
import TrocarSenha from "@/pages/TrocarSenha"
import AdminLogin from "@/pages/admin/AdminLogin"
import AdminLayout from "@/layouts/AdminLayout"
import DashboardPage from "@/pages/admin/DashboardPage"
import PedidosListPage from "@/pages/admin/PedidosListPage"
import PlanosPage from "@/pages/admin/PlanosPage"
import PromptEditorPage from "@/pages/admin/PromptEditorPage"
import DocumentosPage from "@/pages/admin/DocumentosPage"

export default function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/oracao-gratis" element={<PedidoGratuito />} />
          <Route
            path="/oracao-gratis/confirmar"
            element={<PedidoGratuitoConfirmar />}
          />
          <Route
            path="/oracao-gratis/confirmado"
            element={<PedidoGratuitoConfirmado />}
          />
          <Route path="/confirmacao" element={<Confirmacao />} />
          <Route path="/cancelado" element={<Cancelado />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/_dev/showcase" element={<DevShowcase />} />
          <Route path="/_health" element={<HealthDebug />} />

          {/* Customer auth routes (public — gating happens inside) */}
          <Route path="/login" element={<Login />} />
          <Route path="/trocar-senha" element={<TrocarSenha />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="pedidos" element={<PedidosListPage />} />
            <Route path="planos" element={<PlanosPage />} />
            <Route path="prompts" element={<PromptEditorPage />} />
            <Route path="documentos" element={<DocumentosPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </CustomerAuthProvider>
    </AuthProvider>
  )
}

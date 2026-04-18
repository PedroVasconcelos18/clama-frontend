import { Routes, Route } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/admin/ProtectedRoute"
import Landing from "@/pages/Landing"
import FazerPedido from "@/pages/FazerPedido"
import Confirmacao from "@/pages/Confirmacao"
import Cancelado from "@/pages/Cancelado"
import Privacidade from "@/pages/Privacidade"
import Termos from "@/pages/Termos"
import NotFound from "@/pages/NotFound"
import DevShowcase from "@/pages/_DevShowcase"
import HealthDebug from "@/pages/HealthDebug"
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
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/fazer-pedido" element={<FazerPedido />} />
        <Route path="/confirmacao" element={<Confirmacao />} />
        <Route path="/cancelado" element={<Cancelado />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/_dev/showcase" element={<DevShowcase />} />
        <Route path="/_health" element={<HealthDebug />} />

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
    </AuthProvider>
  )
}

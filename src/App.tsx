import { lazy, Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { ProtectedRoute } from "@/components/admin/ProtectedRoute"
import Landing from "@/pages/Landing"
import Confirmar from "@/pages/Confirmar"
import Confirmado from "@/pages/Confirmado"
import Confirmacao from "@/pages/Confirmacao"
import Privacidade from "@/pages/Privacidade"
import Termos from "@/pages/Termos"
import NotFound from "@/pages/NotFound"
import DevShowcase from "@/pages/_DevShowcase"
import HealthDebug from "@/pages/HealthDebug"
import Login from "@/pages/Login"
import TrocarSenha from "@/pages/TrocarSenha"
import RedefinirSenha from "@/pages/RedefinirSenha"
import DefinirSenha from "@/pages/DefinirSenha"
import MinhaConta from "@/pages/MinhaConta"
import AdminLogin from "@/pages/admin/AdminLogin"
import AdminLayout from "@/layouts/AdminLayout"
import DashboardPage from "@/pages/admin/DashboardPage"
import PedidosListPage from "@/pages/admin/PedidosListPage"
import UsuariosPage from "@/pages/admin/UsuariosPage"
import PlanosPage from "@/pages/admin/PlanosPage"
import InstituicoesPage from "@/pages/admin/InstituicoesPage"
import PromptEditorPage from "@/pages/admin/PromptEditorPage"
import DocumentosPage from "@/pages/admin/DocumentosPage"
import RepassesPage from "@/pages/admin/RepassesPage"
import RelatoriosRepassePage from "@/pages/admin/RelatoriosRepassePage"
import TarefasPage from "@/pages/admin/TarefasPage"
import LgpdPage from "@/pages/admin/LgpdPage"
import WebhooksPage from "@/pages/admin/WebhooksPage"
import FreemiumBloqueiosPage from "@/pages/admin/FreemiumBloqueiosPage"

const BlogCommentsPage = lazy(
  () => import("@/pages/admin/blog/BlogCommentsPage"),
)
const BlogBannedPage = lazy(() => import("@/pages/admin/blog/BlogBannedPage"))

function LazyAdmin({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/confirmar" element={<Confirmar />} />
        <Route path="/confirmado" element={<Confirmado />} />
        <Route path="/confirmacao" element={<Confirmacao />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/_dev/showcase" element={<DevShowcase />} />
        <Route path="/_health" element={<HealthDebug />} />

        {/* Customer auth routes (public — gating happens inside) */}
        <Route path="/login" element={<Login />} />
        <Route path="/trocar-senha" element={<TrocarSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/definir-senha" element={<DefinirSenha />} />
        <Route path="/conta" element={<MinhaConta />} />

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
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="customers" element={<Navigate to="/admin/usuarios" replace />} />
          <Route path="planos" element={<PlanosPage />} />
          <Route path="instituicoes" element={<InstituicoesPage />} />
          <Route path="prompts" element={<PromptEditorPage />} />
          <Route path="documentos" element={<DocumentosPage />} />
          <Route path="repasses" element={<RepassesPage />} />
          <Route path="relatorios" element={<RelatoriosRepassePage />} />
          <Route path="tarefas" element={<TarefasPage />} />
          <Route path="lgpd" element={<LgpdPage />} />
          <Route path="webhooks" element={<WebhooksPage />} />
          <Route path="freemium" element={<FreemiumBloqueiosPage />} />
          <Route
            path="blog/comentarios"
            element={
              <LazyAdmin>
                <BlogCommentsPage />
              </LazyAdmin>
            }
          />
          <Route
            path="blog/banidos"
            element={
              <LazyAdmin>
                <BlogBannedPage />
              </LazyAdmin>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  )
}

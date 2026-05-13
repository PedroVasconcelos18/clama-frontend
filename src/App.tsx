import { lazy, Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext"
import { ProtectedRoute } from "@/components/admin/ProtectedRoute"
import Landing from "@/pages/Landing"
import Confirmar from "@/pages/Confirmar"
import Confirmado from "@/pages/Confirmado"
import Confirmacao from "@/pages/Confirmacao"
import Cancelado from "@/pages/Cancelado"
import Privacidade from "@/pages/Privacidade"
import Termos from "@/pages/Termos"
import NotFound from "@/pages/NotFound"
import DevShowcase from "@/pages/_DevShowcase"
import HealthDebug from "@/pages/HealthDebug"
import Login from "@/pages/Login"
import TrocarSenha from "@/pages/TrocarSenha"
import MinhaConta from "@/pages/MinhaConta"
import AdminLogin from "@/pages/admin/AdminLogin"
import AdminLayout from "@/layouts/AdminLayout"
import DashboardPage from "@/pages/admin/DashboardPage"
import PedidosListPage from "@/pages/admin/PedidosListPage"
import PlanosPage from "@/pages/admin/PlanosPage"
import PromptEditorPage from "@/pages/admin/PromptEditorPage"
import DocumentosPage from "@/pages/admin/DocumentosPage"

const BlogPostEditorPage = lazy(
  () => import("@/pages/admin/blog/BlogPostEditorPage"),
)
const BlogPostsListPage = lazy(
  () => import("@/pages/admin/blog/BlogPostsListPage"),
)

function LazyAdmin({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

export default function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/confirmar" element={<Confirmar />} />
          <Route path="/confirmado" element={<Confirmado />} />
          <Route path="/confirmacao" element={<Confirmacao />} />
          <Route path="/cancelado" element={<Cancelado />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/_dev/showcase" element={<DevShowcase />} />
          <Route path="/_health" element={<HealthDebug />} />

          {/* Customer auth routes (public — gating happens inside) */}
          <Route path="/login" element={<Login />} />
          <Route path="/trocar-senha" element={<TrocarSenha />} />
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
            <Route path="planos" element={<PlanosPage />} />
            <Route path="prompts" element={<PromptEditorPage />} />
            <Route path="documentos" element={<DocumentosPage />} />
            <Route
              path="blog/posts"
              element={
                <LazyAdmin>
                  <BlogPostsListPage />
                </LazyAdmin>
              }
            />
            <Route
              path="blog/posts/novo"
              element={
                <LazyAdmin>
                  <BlogPostEditorPage />
                </LazyAdmin>
              }
            />
            <Route
              path="blog/posts/:id/editar"
              element={
                <LazyAdmin>
                  <BlogPostEditorPage />
                </LazyAdmin>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </CustomerAuthProvider>
    </AuthProvider>
  )
}

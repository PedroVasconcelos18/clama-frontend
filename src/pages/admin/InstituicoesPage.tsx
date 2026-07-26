import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAdminApi } from "@/hooks/useAdminApi"
import { PastoralApiError } from "@/lib/api"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Plus, Edit, Power, Filter } from "lucide-react"
import { toast } from "sonner"
import { logoSrc, LOGO_FALLBACK_PATH } from "@/lib/instituicoes"
import type { AdminInstituicao } from "@/types/admin.types"

type StatusFilter = "todos" | "ativos" | "inativos"

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
]

const instituicaoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  ordem: z.coerce.number().int().min(1, "Ordem deve ser pelo menos 1"),
})

type InstituicaoFormInput = z.input<typeof instituicaoSchema>
type InstituicaoFormData = z.output<typeof instituicaoSchema>

function handleImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  img.onerror = null
  if (img.src.endsWith(LOGO_FALLBACK_PATH)) return
  img.src = LOGO_FALLBACK_PATH
}

export default function InstituicoesPage() {
  const { adminFetch } = useAdminApi()
  const [instituicoes, setInstituicoes] = useState<AdminInstituicao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInstituicao, setEditingInstituicao] =
    useState<AdminInstituicao | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<AdminInstituicao | null>(
    null,
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [logoFile, setLogoFile] = useState<File | null>(null)

  // Preview da logo escolhida (object URL, revogado ao trocar de arquivo).
  const logoPreview = useMemo(() => {
    if (!logoFile) return null
    return URL.createObjectURL(logoFile)
  }, [logoFile])
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  const filteredInstituicoes = instituicoes.filter((inst) => {
    if (statusFilter === "todos") return true
    if (statusFilter === "ativos") return inst.ativo
    if (statusFilter === "inativos") return !inst.ativo
    return true
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InstituicaoFormInput, unknown, InstituicaoFormData>({
    resolver: zodResolver(instituicaoSchema),
  })

  async function loadInstituicoes() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await adminFetch<AdminInstituicao[]>(
        "/api/admin/instituicoes/",
        { showToast: false },
      )
      setInstituicoes(data)
    } catch (err) {
      if (err instanceof PastoralApiError) {
        setError(err.pastoralMessage)
      } else {
        setError("Erro ao carregar instituições.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInstituicoes()
  }, [adminFetch])

  function openNewDialog() {
    setEditingInstituicao(null)
    setLogoFile(null)
    reset({
      nome: "",
      ordem: instituicoes.length + 1,
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(inst: AdminInstituicao) {
    setEditingInstituicao(inst)
    setLogoFile(null)
    reset({
      nome: inst.nome,
      ordem: inst.ordem,
    })
    setIsDialogOpen(true)
  }

  async function onSubmit(data: InstituicaoFormData) {
    // FormData (multipart) porque a logo vai como arquivo (logo_file).
    const formData = new FormData()
    formData.append("nome", data.nome)
    formData.append("ordem", String(data.ordem))
    if (logoFile) formData.append("logo_file", logoFile)

    try {
      if (editingInstituicao) {
        await adminFetch(`/api/admin/instituicoes/${editingInstituicao.id}/`, {
          method: "PATCH",
          body: formData,
        })
        toast.success("Instituição atualizada.")
      } else {
        await adminFetch("/api/admin/instituicoes/", {
          method: "POST",
          body: formData,
        })
        toast.success("Instituição criada.")
      }
      setIsDialogOpen(false)
      loadInstituicoes()
    } catch {
      // Toast de erro já exibido automaticamente pelo adminFetch
    }
  }

  async function handleToggleAtivo(inst: AdminInstituicao) {
    try {
      if (inst.ativo) {
        await adminFetch(`/api/admin/instituicoes/${inst.id}/desativar/`, {
          method: "POST",
        })
        toast.success("Instituição desativada.")
      } else {
        await adminFetch(`/api/admin/instituicoes/${inst.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ ativo: true }),
        })
        toast.success("Instituição ativada.")
      }
      setConfirmToggle(null)
      loadInstituicoes()
    } catch {
      // Toast de erro já exibido automaticamente pelo adminFetch
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner className="text-clama-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-serif text-clama-gold">Instituições</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-clama-cream/50" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-9 pl-4 rounded-lg bg-clama-night border border-clama-gold/30 text-clama-cream text-sm focus:outline-none focus:border-clama-gold"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Instituição
          </Button>
        </div>
      </div>

      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}

      {/* Grid */}
      {filteredInstituicoes.length === 0 ? (
        <div className="text-center py-12 text-clama-cream/50">
          {statusFilter === "todos"
            ? "Nenhuma instituição cadastrada."
            : statusFilter === "ativos"
              ? "Nenhuma instituição ativa."
              : "Nenhuma instituição inativa."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInstituicoes.map((inst) => (
            <div
              key={inst.id}
              className={cn(
                "bg-clama-night-deep border rounded-clama-card p-4 transition-opacity",
                inst.ativo
                  ? "border-clama-gold/20"
                  : "border-clama-gold/10 opacity-60",
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={logoSrc(inst.logo)}
                    onError={handleImgError}
                    width={40}
                    height={40}
                    alt=""
                    className="w-10 h-10 shrink-0 rounded object-contain bg-clama-night"
                  />
                  <h3 className="text-lg font-medium text-clama-cream truncate">
                    {inst.nome}
                  </h3>
                </div>
                {!inst.ativo && (
                  <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded shrink-0">
                    Inativo
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-clama-cream/50 mb-4">
                <span>Ordem: {inst.ordem}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(inst)}
                  className="flex-1 text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmToggle(inst)}
                  className={cn(
                    "flex-1",
                    inst.ativo
                      ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      : "text-green-400 hover:text-green-300 hover:bg-green-500/10",
                  )}
                >
                  <Power className="w-4 h-4 mr-1" />
                  {inst.ativo ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">
              {editingInstituicao ? "Editar Instituição" : "Nova Instituição"}
            </DialogTitle>
            {editingInstituicao && (
              <DialogDescription className="text-yellow-400/80">
                Editar a instituição não afeta repasses já registrados.
              </DialogDescription>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-clama-cream/80">
                Nome
              </Label>
              <Input
                id="nome"
                {...register("nome")}
                className="bg-clama-night border-clama-gold/30 text-clama-cream"
              />
              {errors.nome && (
                <p className="text-red-400 text-sm">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_file" className="text-clama-cream/80">
                Logo
              </Label>
              <div className="flex items-center gap-3">
                <img
                  src={logoPreview ?? logoSrc(editingInstituicao?.logo)}
                  onError={handleImgError}
                  width={48}
                  height={48}
                  alt=""
                  className="w-12 h-12 shrink-0 rounded border border-clama-gold/20 object-contain bg-clama-night"
                />
                <input
                  id="logo_file"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-clama-cream/70 file:mr-3 file:rounded-lg file:border-0 file:bg-clama-gold/20 file:px-3 file:py-1.5 file:text-clama-cream hover:file:bg-clama-gold/30"
                />
              </div>
              <p className="text-xs text-clama-cream/40">
                PNG, JPG, SVG, WEBP ou GIF, até 250 KB.
                {editingInstituicao && " Deixe em branco para manter a atual."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordem" className="text-clama-cream/80">
                Ordem
              </Label>
              <Input
                id="ordem"
                type="number"
                min={1}
                {...register("ordem")}
                className="bg-clama-night border-clama-gold/30 text-clama-cream"
              />
              {errors.ordem && (
                <p className="text-red-400 text-sm">{errors.ordem.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 text-clama-cream/60 hover:text-clama-cream"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Toggle Dialog */}
      <Dialog open={!!confirmToggle} onOpenChange={() => setConfirmToggle(null)}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">
              {confirmToggle?.ativo
                ? "Desativar Instituição"
                : "Ativar Instituição"}
            </DialogTitle>
            <DialogDescription className="text-clama-cream/60">
              {confirmToggle?.ativo
                ? `Desativar "${confirmToggle?.nome}"? Ela não aparecerá mais no dropdown de doação.`
                : `Ativar "${confirmToggle?.nome}"? Ela voltará a aparecer no dropdown de doação.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setConfirmToggle(null)}
              className="flex-1 text-clama-cream/60 hover:text-clama-cream"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => confirmToggle && handleToggleAtivo(confirmToggle)}
              className={cn(
                "flex-1",
                confirmToggle?.ativo && "bg-red-500 hover:bg-red-600 text-white",
              )}
            >
              {confirmToggle?.ativo ? "Desativar" : "Ativar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useApi } from "@/hooks/useApi"
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
import { reaisParaCentavos } from "@/lib/formatters"
import { logoSrc, LOGO_FALLBACK_PATH } from "@/lib/instituicoes"
import type { AdminInstituicao } from "@/types/admin.types"

type StatusFilter = "todos" | "ativos" | "inativos"

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
]

const instituicaoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(120, "Nome muito longo"),
  ordem: z.coerce.number().int().min(0, "Ordem não pode ser negativa"),
  causa: z.string().max(140, "Causa muito longa").optional(),
  metaMensal: z.string().optional(),
  custoUnidade: z.string().optional(),
  unidade: z.string().max(40, "Unidade muito longa").optional(),
})

// Campo do formulário -> campo da API (valores em reais no formulário, centavos na API).
const CAMPO_DA_API: Record<string, string> = { metaMensalCentavos: "metaMensal", custoUnidadeCentavos: "custoUnidade" }
const emReais = (c?: number | null) => (c ? (c / 100).toFixed(2).replace(".", ",") : "")
const centavosOuNull = (s?: string) => (s?.trim() ? reaisParaCentavos(s) || null : null)

const LOGO_TIPOS = ["image/png", "image/jpeg", "image/gif", "image/webp"]
const LOGO_MAX_BYTES = 250 * 1024
const LOGO_DICA = "PNG, JPG, GIF ou WEBP, até 250 KB."

function erroDaLogo(f: File): string | null {
  if (!LOGO_TIPOS.includes(f.type)) return `Formato não aceito. ${LOGO_DICA}`
  if (f.size > LOGO_MAX_BYTES) return `A logo passa de 250 KB. ${LOGO_DICA}`
  return null
}

type InstituicaoFormInput = z.input<typeof instituicaoSchema>
type InstituicaoFormData = z.output<typeof instituicaoSchema>

function handleImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  img.onerror = null
  if (img.src.endsWith(LOGO_FALLBACK_PATH)) return
  img.src = LOGO_FALLBACK_PATH
}

export default function InstituicoesPage() {
  const { fetchApi } = useApi()
  const [instituicoes, setInstituicoes] = useState<AdminInstituicao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInstituicao, setEditingInstituicao] =
    useState<AdminInstituicao | null>(null)
  const [confirmRemoverLogo, setConfirmRemoverLogo] = useState<AdminInstituicao | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<AdminInstituicao | null>(
    null,
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoErro, setLogoErro] = useState<string | null>(null)

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
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<InstituicaoFormInput, unknown, InstituicaoFormData>({
    resolver: zodResolver(instituicaoSchema),
  })

  async function loadInstituicoes() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchApi<AdminInstituicao[]>(
        "/api/admin/instituicoes",
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
  }, [fetchApi])

  function openNewDialog() {
    setEditingInstituicao(null)
    setLogoFile(null)
    setLogoErro(null)
    reset({
      nome: "",
      ordem: instituicoes.length + 1,
      causa: "",
      metaMensal: "",
      custoUnidade: "",
      unidade: "",
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(inst: AdminInstituicao) {
    setEditingInstituicao(inst)
    setLogoFile(null)
    setLogoErro(null)
    reset({
      nome: inst.nome,
      ordem: inst.ordem,
      causa: inst.causa ?? "",
      metaMensal: emReais(inst.metaMensalCentavos),
      custoUnidade: emReais(inst.custoUnidadeCentavos),
      unidade: inst.unidade ?? "",
    })
    setIsDialogOpen(true)
  }

  async function enviarLogo(id: number, arquivo: File): Promise<boolean> {
    const formData = new FormData()
    formData.append("logo", arquivo)
    try {
      await fetchApi(`/api/admin/instituicoes/${id}/logo`, { method: "PUT", body: formData, showToast: false })
      return true
    } catch (err) {
      // logo_invalida e arquivo_grande_demais: a mensagem vai embaixo do campo da logo.
      setLogoErro(err instanceof PastoralApiError ? err.pastoralMessage : "Não foi possível enviar a logo.")
      return false
    }
  }

  async function onSubmit(data: InstituicaoFormData) {
    let salva: AdminInstituicao
    // TODO(T11): trocar pelo tipo gerado do OpenAPI. Os 4 campos vão sempre; null limpa.
    const corpo = JSON.stringify({
      nome: data.nome,
      ordem: data.ordem,
      causa: data.causa?.trim() || null,
      metaMensalCentavos: centavosOuNull(data.metaMensal),
      custoUnidadeCentavos: centavosOuNull(data.custoUnidade),
      unidade: data.unidade?.trim() || null,
    })
    try {
      // Criar e editar são JSON; a logo vai em uma segunda chamada (PUT multipart).
      salva = editingInstituicao
        ? await fetchApi<AdminInstituicao>(`/api/admin/instituicoes/${editingInstituicao.id}`, {
            method: "PATCH",
            body: corpo,
            showToast: false,
          })
        : await fetchApi<AdminInstituicao>("/api/admin/instituicoes", {
            method: "POST",
            body: corpo,
            showToast: false,
          })
    } catch (err) {
      if (!(err instanceof PastoralApiError)) return
      const campos = Object.entries(err.campos)
      for (const [campoApi, mensagem] of campos) {
        const campo = CAMPO_DA_API[campoApi] ?? campoApi
        if (campo in instituicaoSchema.shape) setFieldError(campo as keyof InstituicaoFormInput, { message: mensagem })
      }
      if (campos.length === 0) toast.error(err.pastoralMessage)
      return
    }

    if (logoFile && !(await enviarLogo(salva.id, logoFile))) {
      // A instituição já foi gravada: o diálogo continua aberto, agora em edição, só para corrigir a logo.
      setEditingInstituicao(salva)
      loadInstituicoes()
      return
    }
    toast.success(editingInstituicao ? "Instituição atualizada." : "Instituição criada.")
    setIsDialogOpen(false)
    loadInstituicoes()
  }

  async function removerLogo(inst: AdminInstituicao) {
    try {
      await fetchApi(`/api/admin/instituicoes/${inst.id}/logo`, { method: "DELETE" })
      toast.success("Logo removida.")
      setEditingInstituicao({ ...inst, logoUrl: null, temLogo: false })
      loadInstituicoes()
    } catch {
      // Toast de erro já exibido automaticamente pelo fetchApi
    }
  }

  async function handleToggleAtivo(inst: AdminInstituicao) {
    try {
      await fetchApi(`/api/admin/instituicoes/${inst.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !inst.ativo }),
      })
      toast.success(inst.ativo ? "Instituição desativada." : "Instituição ativada.")
      setConfirmToggle(null)
      loadInstituicoes()
    } catch {
      // Toast de erro já exibido automaticamente pelo fetchApi
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
                    src={logoSrc(inst.logoUrl)}
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
              <Label htmlFor="logo" className="text-clama-cream/80">
                Logo
              </Label>
              <div className="flex items-center gap-3">
                <img
                  src={logoPreview ?? logoSrc(editingInstituicao?.logoUrl)}
                  onError={handleImgError}
                  width={48}
                  height={48}
                  alt=""
                  className="w-12 h-12 shrink-0 rounded border border-clama-gold/20 object-contain bg-clama-night"
                />
                <input
                  id="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    const erro = f && erroDaLogo(f)
                    setLogoErro(erro || null)
                    setLogoFile(erro ? null : f)
                  }}
                  className="block w-full text-sm text-clama-cream/70 file:mr-3 file:rounded-lg file:border-0 file:bg-clama-gold/20 file:px-3 file:py-1.5 file:text-clama-cream hover:file:bg-clama-gold/30"
                />
              </div>
              <p className="text-xs text-clama-cream/40">
                {LOGO_DICA}
                {editingInstituicao && " Deixe em branco para manter a atual."}
              </p>
              {logoErro && <p className="text-red-400 text-sm">{logoErro}</p>}
              {editingInstituicao?.temLogo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRemoverLogo(editingInstituicao)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Remover logo
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordem" className="text-clama-cream/80">
                Ordem
              </Label>
              <Input
                id="ordem"
                type="number"
                min={0}
                {...register("ordem")}
                className="bg-clama-night border-clama-gold/30 text-clama-cream"
              />
              {errors.ordem && (
                <p className="text-red-400 text-sm">{errors.ordem.message}</p>
              )}
            </div>

            {([
              ["causa", "Causa", "text"],
              ["metaMensal", "Meta mensal (R$)", "text"],
              ["custoUnidade", "Custo por unidade (R$)", "text"],
              ["unidade", "Unidade", "text"],
            ] as const).map(([campo, rotulo, tipo]) => (
              <div key={campo} className="space-y-2">
                <Label htmlFor={campo} className="text-clama-cream/80">
                  {rotulo}
                </Label>
                <Input
                  id={campo}
                  type={tipo}
                  inputMode={campo.startsWith("meta") || campo.startsWith("custo") ? "decimal" : undefined}
                  {...register(campo)}
                  className="bg-clama-night border-clama-gold/30 text-clama-cream"
                />
                {errors[campo] && <p className="text-red-400 text-sm">{errors[campo]?.message}</p>}
              </div>
            ))}

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

      {/* Confirmar remoção da logo */}
      <Dialog open={!!confirmRemoverLogo} onOpenChange={() => setConfirmRemoverLogo(null)}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">Remover logo</DialogTitle>
            <DialogDescription className="text-clama-cream/60">
              {`Remover a logo de "${confirmRemoverLogo?.nome}"? Ela voltará a usar a imagem padrão.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setConfirmRemoverLogo(null)}
              className="flex-1 text-clama-cream/60 hover:text-clama-cream"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const alvo = confirmRemoverLogo
                setConfirmRemoverLogo(null)
                if (alvo) removerLogo(alvo)
              }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              Remover
            </Button>
          </div>
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

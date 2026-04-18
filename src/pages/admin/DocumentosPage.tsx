import { useState, useEffect, useRef } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  Plus,
  Upload,
  Trash2,
  Power,
  FileText,
  CheckCircle,
  Clock,
  Filter,
} from "lucide-react"
import { toast } from "sonner"
import type { AdminDocumentoContexto } from "@/types/admin.types"

type StatusFilter = "todos" | "ativos" | "inativos"

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx"]

const documentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
})

type DocumentoFormData = z.infer<typeof documentoSchema>

export default function DocumentosPage() {
  const { adminFetch } = useAdminApi()
  const [documentos, setDocumentos] = useState<AdminDocumentoContexto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AdminDocumentoContexto | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<AdminDocumentoContexto | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredDocumentos = documentos.filter((doc) => {
    if (statusFilter === "todos") return true
    if (statusFilter === "ativos") return doc.ativo
    if (statusFilter === "inativos") return !doc.ativo
    return true
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DocumentoFormData>({
    resolver: zodResolver(documentoSchema),
  })

  async function loadDocumentos() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await adminFetch<AdminDocumentoContexto[]>("/api/admin/documentos/", {
        showToast: false,
      })
      setDocumentos(data)
    } catch (err) {
      if (err instanceof PastoralApiError) {
        setError(err.pastoralMessage)
      } else {
        setError("Erro ao carregar documentos.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocumentos()
  }, [adminFetch])

  function openNewDialog() {
    reset({ nome: "", descricao: "" })
    setSelectedFile(null)
    setFileError(null)
    setIsDialogOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setFileError(null)

    if (!file) {
      setSelectedFile(null)
      return
    }

    // Valida pela extensão (mais confiável que file.type)
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    const hasValidExtension = ALLOWED_EXTENSIONS.includes(extension)
    const hasValidType = ALLOWED_TYPES.includes(file.type)

    if (!hasValidExtension && !hasValidType) {
      setFileError("Formato não suportado. Use PDF, DOCX ou TXT.")
      setSelectedFile(null)
      return
    }

    // Valida tamanho
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`Arquivo excede limite de 100MB. Tamanho: ${(file.size / (1024 * 1024)).toFixed(1)}MB`)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  async function onSubmit(data: DocumentoFormData) {
    if (!selectedFile) {
      setFileError("Selecione um arquivo")
      return
    }

    const formData = new FormData()
    formData.append("nome", data.nome)
    formData.append("descricao", data.descricao || "")
    formData.append("arquivo", selectedFile)

    try {
      await adminFetch("/api/admin/documentos/", {
        method: "POST",
        body: formData,
      })
      toast.success("Documento criado. Clique em Ativar para sincronizar e usar no contexto das orações.")
      setIsDialogOpen(false)
      loadDocumentos()
    } catch {
      // Toast de erro já exibido pelo adminFetch
    }
  }

  async function handleToggleAtivo(doc: AdminDocumentoContexto) {
    setTogglingId(doc.id)
    setConfirmToggle(null)
    try {
      await adminFetch(`/api/admin/documentos/${doc.id}/toggle_ativo/`, {
        method: "POST",
      })
      if (doc.ativo) {
        toast.success("Documento desativado e dessincronizado.")
      } else {
        toast.success("Documento ativado e sincronizado.")
      }
      loadDocumentos()
    } catch {
      // Toast de erro já exibido pelo adminFetch
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(doc: AdminDocumentoContexto) {
    try {
      await adminFetch(`/api/admin/documentos/${doc.id}/`, {
        method: "DELETE",
      })
      toast.success("Documento removido.")
      setConfirmDelete(null)
      loadDocumentos()
    } catch {
      // Toast de erro já exibido pelo adminFetch
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
        <div>
          <h1 className="text-2xl font-serif text-clama-gold">Documentos de Contexto</h1>
          <p className="text-sm text-clama-cream/60 mt-1">
            PDFs e textos usados como referência na geração de orações
          </p>
        </div>
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
            Novo Documento
          </Button>
        </div>
      </div>

      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}

      {/* Documents List */}
      {filteredDocumentos.length === 0 ? (
        <div className="text-center py-12 text-clama-cream/50">
          {statusFilter === "todos"
            ? "Nenhum documento cadastrado."
            : `Nenhum documento ${statusFilter.replace("_", " ")}.`}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocumentos.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "bg-clama-night-deep border rounded-clama-card p-4 transition-opacity",
                doc.ativo ? "border-clama-gold/20" : "border-clama-gold/10 opacity-60"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-clama-gold/10">
                    <FileText className="w-5 h-5 text-clama-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-clama-cream truncate">
                        {doc.nome}
                      </h3>
                      {!doc.ativo && (
                        <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">
                          Inativo
                        </span>
                      )}
                    </div>
                    {doc.descricao && (
                      <p className="text-sm text-clama-cream/60 mt-1 line-clamp-2">
                        {doc.descricao}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-clama-cream/50">
                      <span>
                        {doc.tipo_mime === "application/pdf"
                          ? "PDF"
                          : doc.tipo_mime.includes("wordprocessingml")
                            ? "DOCX"
                            : "TXT"}
                      </span>
                      <span>&bull;</span>
                      <span>{doc.tamanho_formatado}</span>
                      <span>&bull;</span>
                      {doc.ativo ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Clock className="w-3 h-3" />
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 sm:flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmToggle(doc)}
                    disabled={togglingId === doc.id}
                    className={cn(
                      doc.ativo
                        ? "text-yellow-400/60 hover:text-yellow-400 hover:bg-yellow-500/10"
                        : "text-green-400/60 hover:text-green-400 hover:bg-green-500/10"
                    )}
                    title={doc.ativo ? "Desativar do contexto" : "Ativar no contexto (sincroniza se necessário)"}
                  >
                    {togglingId === doc.id ? (
                      <LoadingSpinner className="w-4 h-4" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                    <span className="ml-1 hidden sm:inline">
                      {doc.ativo ? "Desativar" : "Ativar"}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(doc)}
                    className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                    title="Excluir documento permanentemente"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="ml-1 hidden sm:inline">Excluir</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">Novo Documento de Contexto</DialogTitle>
            <DialogDescription className="text-clama-cream/60">
              Faça upload de um PDF ou arquivo de texto para usar como contexto nas orações.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-clama-cream/80">
                Nome
              </Label>
              <Input
                id="nome"
                {...register("nome")}
                placeholder="Ex: Devocional Matinal"
                className="bg-clama-night border-clama-gold/30 text-clama-cream"
              />
              {errors.nome && (
                <p className="text-red-400 text-sm">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-clama-cream/80">
                Descrição (opcional)
              </Label>
              <Textarea
                id="descricao"
                rows={2}
                {...register("descricao")}
                placeholder="Descreva o conteúdo e propósito do documento"
                className="bg-clama-night border-clama-gold/30 text-clama-cream"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-clama-cream/80">Arquivo</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  selectedFile
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-clama-gold/30 hover:border-clama-gold/50 hover:bg-clama-gold/5"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span>{selectedFile.name}</span>
                    <span className="text-clama-cream/50">
                      ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : (
                  <div className="text-clama-cream/50">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p>Clique para selecionar</p>
                    <p className="text-xs mt-1">PDF, DOCX ou TXT (máx 100MB)</p>
                  </div>
                )}
              </div>
              {fileError && <p className="text-red-400 text-sm">{fileError}</p>}
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
              <Button type="submit" disabled={isSubmitting || !selectedFile} className="flex-1">
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Enviando...
                  </>
                ) : (
                  "Criar Documento"
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
              {confirmToggle?.ativo ? "Desativar Documento" : "Ativar Documento"}
            </DialogTitle>
            <DialogDescription className="text-clama-cream/60">
              {confirmToggle?.ativo
                ? `Desativar "${confirmToggle?.nome}"? O documento não será usado no contexto das orações.`
                : confirmToggle?.esta_sincronizado
                  ? `Ativar "${confirmToggle?.nome}"? O documento será usado no contexto das orações.`
                  : `Ativar "${confirmToggle?.nome}"? O documento será sincronizado com a Anthropic e usado no contexto das orações.`}
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
                confirmToggle?.ativo && "bg-yellow-600 hover:bg-yellow-700 text-white"
              )}
            >
              {confirmToggle?.ativo ? "Desativar" : "Ativar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">Excluir Documento</DialogTitle>
            <DialogDescription className="text-clama-cream/60">
              Excluir "{confirmDelete?.nome}"? Esta ação removerá o documento localmente e da Anthropic.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              className="flex-1 text-clama-cream/60 hover:text-clama-cream"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

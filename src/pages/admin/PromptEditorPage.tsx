import { useState, useEffect } from "react"
import { useAdminApi } from "@/hooks/useAdminApi"
import { PastoralApiError } from "@/lib/api"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import { PastoralAlert } from "@/components/utility/PastoralAlert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Plus, Play, Check, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import type { AdminPromptTemplate, PreviewResponse } from "@/types/admin.types"

export default function PromptEditorPage() {
  const { adminFetch } = useAdminApi()
  const [templates, setTemplates] = useState<AdminPromptTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<AdminPromptTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editBuffer, setEditBuffer] = useState<{
    nome: string
    system_prompt: string
    instrucoes_simples: string
    instrucoes_versiculo: string
    instrucoes_profecia: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Preview state
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState({
    nome: "Maria",
    sexo: "feminino",
    pedido_oracao: "Peço oração pela minha família.",
    plano_complexidade: "simples",
  })
  const [previewResult, setPreviewResult] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // Confirm activate
  const [confirmActivate, setConfirmActivate] = useState<AdminPromptTemplate | null>(null)

  async function loadTemplates() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await adminFetch<AdminPromptTemplate[]>("/api/admin/prompts/")
      setTemplates(data)
      // Select active or first
      const active = data.find((t) => t.ativo) || data[0]
      if (active) setSelectedTemplate(active)
    } catch (err) {
      if (err instanceof PastoralApiError) {
        setError(err.pastoralMessage)
      } else {
        setError("Erro ao carregar prompts.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [adminFetch])

  function startNewVersion() {
    if (!selectedTemplate) return
    setIsEditing(true)
    setEditBuffer({
      nome: selectedTemplate.nome,
      system_prompt: selectedTemplate.system_prompt,
      instrucoes_simples: selectedTemplate.instrucoes_por_complexidade?.simples || "",
      instrucoes_versiculo: selectedTemplate.instrucoes_por_complexidade?.com_versiculo || "",
      instrucoes_profecia:
        selectedTemplate.instrucoes_por_complexidade?.com_profecia_e_versiculos || "",
    })
  }

  function cancelEdit() {
    setIsEditing(false)
    setEditBuffer(null)
  }

  async function saveNewVersion() {
    if (!editBuffer) return
    setIsSaving(true)
    try {
      const payload = {
        nome: editBuffer.nome,
        system_prompt: editBuffer.system_prompt,
        instrucoes_por_complexidade: {
          simples: editBuffer.instrucoes_simples,
          com_versiculo: editBuffer.instrucoes_versiculo,
          com_profecia_e_versiculos: editBuffer.instrucoes_profecia,
        },
      }
      await adminFetch("/api/admin/prompts/", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      toast.success("Nova versão salva.")
      setIsEditing(false)
      setEditBuffer(null)
      loadTemplates()
    } catch (err) {
      if (err instanceof PastoralApiError) {
        toast.error(err.pastoralMessage)
      } else {
        toast.error("Erro ao salvar versão.")
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function activateTemplate(template: AdminPromptTemplate) {
    try {
      await adminFetch(`/api/admin/prompts/${template.id}/ativar/`, {
        method: "POST",
      })
      toast.success(`Versão ${template.versao} ativada.`)
      setConfirmActivate(null)
      loadTemplates()
    } catch (err) {
      if (err instanceof PastoralApiError) {
        toast.error(err.pastoralMessage)
      } else {
        toast.error("Erro ao ativar versão.")
      }
    }
  }

  async function runPreview() {
    if (!selectedTemplate) return
    setIsLoadingPreview(true)
    setPreviewResult(null)
    try {
      const data = await adminFetch<PreviewResponse>(
        `/api/admin/prompts/${selectedTemplate.id}/preview/`,
        {
          method: "POST",
          body: JSON.stringify({ pedido_exemplo: previewData }),
        }
      )
      setPreviewResult(data.oracao_preview)
    } catch (err) {
      if (err instanceof PastoralApiError) {
        toast.error(err.pastoralMessage)
      } else {
        toast.error("Erro ao gerar preview.")
      }
    } finally {
      setIsLoadingPreview(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner className="text-clama-gold" />
      </div>
    )
  }

  if (error) {
    return <PastoralAlert variant="error">{error}</PastoralAlert>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-serif text-clama-gold">Prompts</h1>
      </div>

      {/* Info Banner */}
      <div className="bg-clama-gold/10 border border-clama-gold/30 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-clama-gold shrink-0 mt-0.5" />
        <p className="text-sm text-clama-cream/80">
          Cada save cria nova versão. Versões antigas ficam preservadas. A geração de orações usa
          sempre a versão ativa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Versions List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-medium text-clama-cream/60 uppercase tracking-wide">
            Versões
          </h2>
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedTemplate(template)
                  setIsEditing(false)
                  setEditBuffer(null)
                }}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors",
                  selectedTemplate?.id === template.id
                    ? "bg-clama-gold/10 border-clama-gold/40"
                    : "bg-clama-night-deep border-clama-gold/10 hover:border-clama-gold/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-clama-cream font-medium">
                    {template.nome} <span className="text-clama-cream/40">v{template.versao}</span>
                  </span>
                  {template.ativo && (
                    <span className="px-2 py-0.5 text-xs bg-clama-gold/20 text-clama-gold rounded">
                      Ativa
                    </span>
                  )}
                </div>
                <p className="text-xs text-clama-cream/50 mt-1">
                  {new Date(template.created_at).toLocaleDateString("pt-BR")}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTemplate && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-clama-cream/60 uppercase tracking-wide">
                  {isEditing ? "Nova Versão (editando)" : "Visualizando"}
                </h2>
                <div className="flex gap-2">
                  {!isEditing && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                        className="text-clama-cream/60 hover:text-clama-cream"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      {!selectedTemplate.ativo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmActivate(selectedTemplate)}
                          className="text-green-400 hover:text-green-300"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Ativar
                        </Button>
                      )}
                      <Button size="sm" onClick={startNewVersion}>
                        <Plus className="w-4 h-4 mr-1" />
                        Nova versão
                      </Button>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                        className="text-clama-cream/60 hover:text-clama-cream"
                      >
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={saveNewVersion} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <LoadingSpinner className="w-4 h-4 mr-1" />
                            Salvando...
                          </>
                        ) : (
                          "Salvar como nova versão"
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4 bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-4">
                {/* Nome */}
                <div className="space-y-2">
                  <Label className="text-clama-cream/80">Nome</Label>
                  {isEditing && editBuffer ? (
                    <Input
                      value={editBuffer.nome}
                      onChange={(e) =>
                        setEditBuffer({ ...editBuffer, nome: e.target.value })
                      }
                      className="bg-clama-night border-clama-gold/30 text-clama-cream"
                    />
                  ) : (
                    <p className="text-clama-cream">{selectedTemplate.nome}</p>
                  )}
                </div>

                {/* System Prompt */}
                <div className="space-y-2">
                  <Label className="text-clama-cream/80">System Prompt</Label>
                  {isEditing && editBuffer ? (
                    <Textarea
                      value={editBuffer.system_prompt}
                      onChange={(e) =>
                        setEditBuffer({ ...editBuffer, system_prompt: e.target.value })
                      }
                      rows={10}
                      className="bg-clama-night border-clama-gold/30 text-clama-cream font-mono text-sm"
                    />
                  ) : (
                    <div className="bg-clama-night rounded-lg p-3 max-h-64 overflow-y-auto">
                      <pre className="text-sm text-clama-cream/80 whitespace-pre-wrap font-mono">
                        {selectedTemplate.system_prompt}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Instruções por Complexidade */}
                <div className="space-y-4 pt-4 border-t border-clama-gold/10">
                  <h3 className="text-sm font-medium text-clama-cream/60">
                    Instruções por Complexidade
                  </h3>

                  {/* Simples */}
                  <div className="space-y-2">
                    <Label className="text-clama-cream/80">Simples</Label>
                    {isEditing && editBuffer ? (
                      <Textarea
                        value={editBuffer.instrucoes_simples}
                        onChange={(e) =>
                          setEditBuffer({ ...editBuffer, instrucoes_simples: e.target.value })
                        }
                        rows={3}
                        className="bg-clama-night border-clama-gold/30 text-clama-cream font-mono text-sm"
                      />
                    ) : (
                      <div className="bg-clama-night rounded-lg p-3">
                        <pre className="text-sm text-clama-cream/80 whitespace-pre-wrap font-mono">
                          {selectedTemplate.instrucoes_por_complexidade?.simples || "(vazio)"}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Com Versículo */}
                  <div className="space-y-2">
                    <Label className="text-clama-cream/80">Com Versículo</Label>
                    {isEditing && editBuffer ? (
                      <Textarea
                        value={editBuffer.instrucoes_versiculo}
                        onChange={(e) =>
                          setEditBuffer({ ...editBuffer, instrucoes_versiculo: e.target.value })
                        }
                        rows={3}
                        className="bg-clama-night border-clama-gold/30 text-clama-cream font-mono text-sm"
                      />
                    ) : (
                      <div className="bg-clama-night rounded-lg p-3">
                        <pre className="text-sm text-clama-cream/80 whitespace-pre-wrap font-mono">
                          {selectedTemplate.instrucoes_por_complexidade?.com_versiculo || "(vazio)"}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Com Profecia e Versículos */}
                  <div className="space-y-2">
                    <Label className="text-clama-cream/80">Com Profecia e Versículos</Label>
                    {isEditing && editBuffer ? (
                      <Textarea
                        value={editBuffer.instrucoes_profecia}
                        onChange={(e) =>
                          setEditBuffer({ ...editBuffer, instrucoes_profecia: e.target.value })
                        }
                        rows={3}
                        className="bg-clama-night border-clama-gold/30 text-clama-cream font-mono text-sm"
                      />
                    ) : (
                      <div className="bg-clama-night rounded-lg p-3">
                        <pre className="text-sm text-clama-cream/80 whitespace-pre-wrap font-mono">
                          {selectedTemplate.instrucoes_por_complexidade?.com_profecia_e_versiculos ||
                            "(vazio)"}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">Preview de Oração</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-clama-cream/80">Nome</Label>
                <Input
                  value={previewData.nome}
                  onChange={(e) => setPreviewData({ ...previewData, nome: e.target.value })}
                  className="bg-clama-night border-clama-gold/30 text-clama-cream"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-clama-cream/80">Sexo</Label>
                <select
                  value={previewData.sexo}
                  onChange={(e) => setPreviewData({ ...previewData, sexo: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-clama-night border border-clama-gold/30 text-clama-cream text-sm"
                >
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-clama-cream/80">Pedido de Oração</Label>
              <Textarea
                value={previewData.pedido_oracao}
                onChange={(e) =>
                  setPreviewData({ ...previewData, pedido_oracao: e.target.value })
                }
                rows={3}
                className="bg-clama-night border-clama-gold/30 text-clama-cream"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-clama-cream/80">Complexidade</Label>
              <select
                value={previewData.plano_complexidade}
                onChange={(e) =>
                  setPreviewData({ ...previewData, plano_complexidade: e.target.value })
                }
                className="w-full h-9 px-3 rounded-lg bg-clama-night border border-clama-gold/30 text-clama-cream text-sm"
              >
                <option value="simples">Simples</option>
                <option value="com_versiculo">Com Versículo</option>
                <option value="com_profecia_e_versiculos">Com Profecia e Versículos</option>
              </select>
            </div>

            <Button onClick={runPreview} disabled={isLoadingPreview} className="w-full">
              {isLoadingPreview ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Gerando preview...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Gerar Preview
                </>
              )}
            </Button>

            {previewResult && (
              <div className="bg-clama-night rounded-lg p-4 mt-4">
                <h4 className="text-sm font-medium text-clama-gold mb-2">Oração Gerada</h4>
                <p className="text-sm text-clama-cream font-serif whitespace-pre-wrap">
                  {previewResult}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Activate Dialog */}
      <Dialog open={!!confirmActivate} onOpenChange={() => setConfirmActivate(null)}>
        <DialogContent className="bg-clama-night-deep border-clama-gold/20 text-clama-cream">
          <DialogHeader>
            <DialogTitle className="text-clama-gold">Ativar Versão</DialogTitle>
          </DialogHeader>
          <p className="text-clama-cream/80 mt-2">
            Ativar versão {confirmActivate?.versao}? A versão atual será desativada.
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setConfirmActivate(null)}
              className="flex-1 text-clama-cream/60 hover:text-clama-cream"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => confirmActivate && activateTemplate(confirmActivate)}
              className="flex-1"
            >
              Ativar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

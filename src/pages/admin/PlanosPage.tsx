import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
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
import { Plus, Edit, Power, Filter } from "lucide-react"
import { toast } from "sonner"
import type { AdminPlano } from "@/types/admin.types"

type StatusFilter = "todos" | "ativos" | "inativos"

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
]

const COMPLEXIDADE_OPTIONS = [
  { value: "simples", label: "Simples" },
  { value: "com_versiculo", label: "Com Versículo" },
  { value: "com_profecia_e_versiculos", label: "Com Profecia e Versículos" },
]

const planoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  valor_reais: z
    .string()
    .min(1, "Valor é obrigatório")
    .refine(
      (val) => {
        // Remove pontos de milhar e troca vírgula por ponto
        const normalized = val.replace(/\./g, "").replace(",", ".")
        const num = parseFloat(normalized)
        return !isNaN(num) && num >= 0.01
      },
      "Valor deve ser no mínimo R$ 0,01"
    ),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  complexidade: z.enum(["simples", "com_versiculo", "com_profecia_e_versiculos"]),
  ordem: z.coerce.number().int().min(1, "Ordem deve ser pelo menos 1"),
})

function formatCurrencyInput(value: string): string {
  // Remove tudo que não é dígito ou vírgula
  let cleaned = value.replace(/[^\d,]/g, "")

  // Garante apenas uma vírgula
  const parts = cleaned.split(",")
  if (parts.length > 2) {
    cleaned = parts[0] + "," + parts.slice(1).join("")
  }

  // Limita centavos a 2 dígitos
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + "," + parts[1].slice(0, 2)
  }

  // Separa parte inteira e decimal
  let [intPart, decPart] = cleaned.split(",")

  // Remove zeros à esquerda desnecessários na parte inteira
  // Permite no máximo 2 zeros se não houver outro dígito (para casos como "00,20")
  // Remove zeros extras além de 2
  if (intPart.length > 2 && /^0+/.test(intPart)) {
    // Remove todos os zeros à esquerda, mantendo pelo menos um dígito
    intPart = intPart.replace(/^0+/, "") || "0"
  } else if (intPart.length === 2 && intPart === "00") {
    // Permite "00" para casos como "00,20"
    intPart = "00"
  } else if (intPart.length > 1 && intPart.startsWith("0") && intPart !== "00") {
    // Caso como "01", "02" - remove o zero à esquerda
    intPart = intPart.replace(/^0+/, "") || "0"
  }

  // Adiciona pontos de milhar na parte inteira (apenas se não começar com zeros)
  const formattedInt = intPart.startsWith("0")
    ? intPart
    : intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt
}

function parseCurrencyToFloat(value: string): number {
  // Remove pontos de milhar e troca vírgula por ponto
  const normalized = value.replace(/\./g, "").replace(",", ".")
  return parseFloat(normalized) || 0
}

type PlanoFormInput = z.input<typeof planoSchema>
type PlanoFormData = z.output<typeof planoSchema>

export default function PlanosPage() {
  const { adminFetch } = useAdminApi()
  const [planos, setPlanos] = useState<AdminPlano[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPlano, setEditingPlano] = useState<AdminPlano | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<AdminPlano | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")

  const filteredPlanos = planos.filter((plano) => {
    if (statusFilter === "todos") return true
    if (statusFilter === "ativos") return plano.ativo
    if (statusFilter === "inativos") return !plano.ativo
    return true
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PlanoFormInput, unknown, PlanoFormData>({
    resolver: zodResolver(planoSchema),
  })

  async function loadPlanos() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await adminFetch<AdminPlano[]>("/api/admin/planos/", {
        showToast: false,
      })
      setPlanos(data)
    } catch (err) {
      if (err instanceof PastoralApiError) {
        setError(err.pastoralMessage)
      } else {
        setError("Erro ao carregar planos.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPlanos()
  }, [adminFetch])

  function openNewDialog() {
    setEditingPlano(null)
    reset({
      nome: "",
      valor_reais: "",
      descricao: "",
      complexidade: "simples",
      ordem: planos.length + 1,
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(plano: AdminPlano) {
    setEditingPlano(plano)
    // Formata valor com vírgula para decimais e ponto para milhares
    const valorReais = formatCurrencyInput(
      (plano.valor_centavos / 100).toFixed(2).replace(".", ",")
    )
    reset({
      nome: plano.nome,
      valor_reais: valorReais,
      descricao: plano.descricao,
      complexidade: plano.complexidade,
      ordem: plano.ordem,
    })
    setIsDialogOpen(true)
  }

  async function onSubmit(data: PlanoFormData) {
    const valorCentavos = Math.round(parseCurrencyToFloat(data.valor_reais) * 100)

    const payload = {
      nome: data.nome,
      valor_centavos: valorCentavos,
      descricao: data.descricao,
      complexidade: data.complexidade,
      ordem: data.ordem,
    }

    try {
      if (editingPlano) {
        await adminFetch(`/api/admin/planos/${editingPlano.id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
        toast.success("Plano atualizado.")
      } else {
        await adminFetch("/api/admin/planos/", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        toast.success("Plano criado.")
      }
      setIsDialogOpen(false)
      loadPlanos()
    } catch {
      // Toast de erro já exibido automaticamente pelo adminFetch
    }
  }

  async function handleToggleAtivo(plano: AdminPlano) {
    try {
      if (plano.ativo) {
        await adminFetch(`/api/admin/planos/${plano.id}/desativar/`, {
          method: "POST",
        })
        toast.success("Plano desativado.")
      } else {
        await adminFetch(`/api/admin/planos/${plano.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ ativo: true }),
        })
        toast.success("Plano ativado.")
      }
      setConfirmToggle(null)
      loadPlanos()
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
        <h1 className="text-2xl font-serif text-clama-gold">Planos</h1>
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
            Novo Plano
          </Button>
        </div>
      </div>

      {error && <PastoralAlert variant="error">{error}</PastoralAlert>}

      {/* Plans Grid */}
      {filteredPlanos.length === 0 ? (
        <div className="text-center py-12 text-clama-cream/50">
          {statusFilter === "todos"
            ? "Nenhum plano cadastrado."
            : statusFilter === "ativos"
              ? "Nenhum plano ativo."
              : "Nenhum plano inativo."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlanos.map((plano) => (
            <div
            key={plano.id}
            className={cn(
              "bg-clama-night-deep border rounded-clama-card p-4 transition-opacity",
              plano.ativo ? "border-clama-gold/20" : "border-clama-gold/10 opacity-60"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-medium text-clama-cream">{plano.nome}</h3>
                <p className="text-2xl font-bold text-clama-gold mt-1">
                  {plano.valor_reais_str}
                </p>
              </div>
              {!plano.ativo && (
                <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded">
                  Inativo
                </span>
              )}
            </div>

            <p className="text-sm text-clama-cream/70 mb-3 line-clamp-2">
              {plano.descricao}
            </p>

            <div className="flex items-center gap-2 text-xs text-clama-cream/50 mb-4">
              <span className="capitalize">{plano.complexidade.replace(/_/g, " ")}</span>
              <span>&bull;</span>
              <span>Ordem: {plano.ordem}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditDialog(plano)}
                className="flex-1 text-clama-cream/60 hover:text-clama-cream hover:bg-clama-gold/10"
              >
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmToggle(plano)}
                className={cn(
                  "flex-1",
                  plano.ativo
                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    : "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                )}
              >
                <Power className="w-4 h-4 mr-1" />
                {plano.ativo ? "Desativar" : "Ativar"}
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
              {editingPlano ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
            {editingPlano && (
              <DialogDescription className="text-yellow-400/80">
                Editar valor ou complexidade não afeta pedidos já realizados.
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
              <Label htmlFor="valor_reais" className="text-clama-cream/80">
                Valor (R$)
              </Label>
              <Controller
                name="valor_reais"
                control={control}
                render={({ field }) => (
                  <Input
                    id="valor_reais"
                    placeholder="20,00"
                    value={field.value || ""}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(e.target.value)
                      field.onChange(formatted)
                    }}
                    onBlur={field.onBlur}
                    className="bg-clama-night border-clama-gold/30 text-clama-cream"
                  />
                )}
              />
              {errors.valor_reais && (
                <p className="text-red-400 text-sm">{errors.valor_reais.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-clama-cream/80">
                Descrição
              </Label>
              <Textarea
                id="descricao"
                rows={3}
                {...register("descricao")}
                className="bg-clama-night border-clama-gold/30 text-clama-cream"
              />
              {errors.descricao && (
                <p className="text-red-400 text-sm">{errors.descricao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="complexidade" className="text-clama-cream/80">
                Complexidade
              </Label>
              <select
                id="complexidade"
                {...register("complexidade")}
                className="w-full h-9 px-3 rounded-lg bg-clama-night border border-clama-gold/30 text-clama-cream text-sm focus:outline-none focus:border-clama-gold"
              >
                {COMPLEXIDADE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.complexidade && (
                <p className="text-red-400 text-sm">{errors.complexidade.message}</p>
              )}
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
              {confirmToggle?.ativo ? "Desativar Plano" : "Ativar Plano"}
            </DialogTitle>
            <DialogDescription className="text-clama-cream/60">
              {confirmToggle?.ativo
                ? `Desativar "${confirmToggle?.nome}"? O plano não aparecerá mais para as usuárias.`
                : `Ativar "${confirmToggle?.nome}"? O plano voltará a aparecer para as usuárias.`}
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
                confirmToggle?.ativo &&
                  "bg-red-500 hover:bg-red-600 text-white"
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

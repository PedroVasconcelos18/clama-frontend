import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ListChecks } from "lucide-react"

import { useApi } from "@/hooks/useApi"
import { LoadingSpinner } from "@/components/utility/LoadingSpinner"
import type { components } from "@/types/api-schema"

type Tarefa = components["schemas"]["Tarefa"]

/** Por ora só o cartão de tarefas; pedidos, faturamento e custo chegam na onda 7b (as rotas de métricas ainda não existem). */
export default function DashboardPage() {
  const { fetchApi } = useApi()
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    fetchApi<Tarefa[]>("/api/admin/tarefas", { showToast: false })
      .then(setTarefas)
      .catch(() => setFalhou(true))
  }, [fetchApi])

  const problemas = tarefas?.filter((t) => t.situacao !== "ok").length ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif text-clama-gold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-clama-night-deep border border-clama-gold/20 rounded-clama-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-clama-gold/10 rounded-lg">
              <ListChecks className="w-5 h-5 text-clama-gold" />
            </div>
            <span className="text-clama-cream/60 text-sm">Tarefas</span>
          </div>
          {falhou ? (
            <p className="text-sm text-red-300">Não foi possível ler as tarefas.</p>
          ) : !tarefas ? (
            <LoadingSpinner size={20} />
          ) : problemas === 0 ? (
            <Link to="/admin/tarefas" className="text-lg text-clama-cream">Tarefas: tudo em dia</Link>
          ) : (
            <Link to="/admin/tarefas" className="text-lg font-semibold text-red-300">
              Tarefas: {problemas} {problemas === 1 ? "com problema" : "com problemas"}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

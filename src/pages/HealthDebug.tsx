import { useEffect, useState } from "react"
import { apiFetch, PastoralApiError } from "@/lib/api"
import LoadingSpinner from "@/components/utility/LoadingSpinner"
import PastoralAlert from "@/components/utility/PastoralAlert"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { HealthResponse } from "@/types/health"

type State =
  | { kind: "loading" }
  | { kind: "success"; data: HealthResponse }
  | { kind: "error"; message: string }

export default function HealthDebug() {
  const [state, setState] = useState<State>({ kind: "loading" })

  useEffect(() => {
    apiFetch<HealthResponse>("/api/health/")
      .then((data) => setState({ kind: "success", data }))
      .catch((err: unknown) => {
        const message =
          err instanceof PastoralApiError
            ? err.pastoralMessage
            : "Algo não saiu como o esperado."
        setState({ kind: "error", message })
      })
  }, [])

  return (
    <div className="min-h-screen bg-clama-night text-clama-cream flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {state.kind === "loading" && (
          <div className="flex items-center gap-3 text-clama-gold">
            <LoadingSpinner />
            <span>Verificando conexão…</span>
          </div>
        )}
        {state.kind === "success" && (
          <Card className="bg-clama-night-soft border-clama-gold/40">
            <CardHeader>
              <CardTitle className="text-clama-gold">
                Backend conectado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-sm">
              <div>status: {state.data.status}</div>
              <div>version: {state.data.version}</div>
              <div>database: {state.data.database}</div>
              <div>timestamp: {state.data.timestamp}</div>
            </CardContent>
          </Card>
        )}
        {state.kind === "error" && (
          <PastoralAlert variant="error">{state.message}</PastoralAlert>
        )}
      </div>
    </div>
  )
}

export interface HealthResponse {
  status: string
  version: string
  database: "ok" | "error"
  timestamp: string
}

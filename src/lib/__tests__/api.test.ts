import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { apiFetch, PastoralApiError } from "../api"

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "http://localhost:8000")
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it("returns typed data on successful response", async () => {
    interface HealthResponse {
      status: string
      version: string
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", version: "0.1.0" }),
    })

    const result = await apiFetch<HealthResponse>("/api/health/")

    expect(result.status).toBe("ok")
    expect(result.version).toBe("0.1.0")
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/health/",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      })
    )
  })

  it("throws PastoralApiError with pastoral_message from API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: {
            code: "validation_error",
            message: "Campo obrigatório",
            pastoral_message:
              "Por favor, preencha todos os campos necessários.",
          },
        }),
    })

    await expect(apiFetch("/api/pedidos/")).rejects.toThrow(PastoralApiError)

    try {
      await apiFetch("/api/pedidos/")
    } catch (e) {
      const error = e as PastoralApiError
      expect(error.code).toBe("validation_error")
      expect(error.pastoralMessage).toBe(
        "Por favor, preencha todos os campos necessários."
      )
      expect(error.httpStatus).toBe(400)
    }
  })

  it("throws PastoralApiError with fallback message when API response has no pastoral shape", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: "Internal server error" }),
    })

    try {
      await apiFetch("/api/pedidos/")
    } catch (e) {
      const error = e as PastoralApiError
      expect(error.code).toBe("unknown")
      expect(error.pastoralMessage).toBe(
        "Algo não saiu como o esperado. Vamos tentar de novo em instantes."
      )
      expect(error.httpStatus).toBe(500)
    }
  })

  it("throws PastoralApiError on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

    try {
      await apiFetch("/api/health/")
    } catch (e) {
      const error = e as PastoralApiError
      expect(error.code).toBe("network_error")
      expect(error.pastoralMessage).toBe(
        "Parece que sua conexão oscilou. Tente novamente daqui a pouco."
      )
      expect(error.httpStatus).toBe(0)
    }
  })
})

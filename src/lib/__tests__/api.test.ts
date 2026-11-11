import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { apiFetch, PastoralApiError } from "../api"

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    // Base vazia = caminho relativo, resolvido pelo rewrite de `/api/*`
    // (vercel.json em produção, server.proxy do Vite em dev).
    vi.stubEnv("VITE_API_URL", "")
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
      "/api/health/",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      })
    )
  })

  it("lê codigo e mensagemPastoral do ProblemDetail", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          codigo: "validacao",
          mensagemPastoral: "Por favor, preencha todos os campos necessários.",
          erros: [{ campo: "email", mensagem: "obrigatório" }],
        }),
    })

    const error = (await apiFetch("/api/pedidos/", { showToast: false }).catch(
      (e) => e
    )) as PastoralApiError
    expect(error).toBeInstanceOf(PastoralApiError)
    expect(error.code).toBe("validacao")
    expect(error.pastoralMessage).toBe(
      "Por favor, preencha todos os campos necessários."
    )
    expect(error.httpStatus).toBe(400)
  })

  it("monta campos a partir de erros[] do corpo", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          codigo: "dados_invalidos",
          mensagemPastoral: "Confira.",
          erros: [{ campo: "nome", mensagem: "Já existe." }],
        }),
    })
    const error = (await apiFetch("/api/x", { showToast: false }).catch((e) => e)) as PastoralApiError
    expect(error.campos).toEqual({ nome: "Já existe." })
  })

  it("sem mensagem pastoral nem erros, usa detail; sem codigo, unknown", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ title: "Internal Server Error", detail: "Falhou" }),
    })

    const error = (await apiFetch("/api/pedidos/", { showToast: false }).catch(
      (e) => e
    )) as PastoralApiError
    expect(error.code).toBe("unknown")
    expect(error.pastoralMessage).toBe("Falhou")
  })

  it("POST leva X-XSRF-TOKEN do cookie lido na hora; 204 vira {}", async () => {
    document.cookie = "XSRF-TOKEN=tok1; path=/"
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 })

    await expect(
      apiFetch("/api/auth/logout", { method: "POST" })
    ).resolves.toEqual({})
    const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1].headers
    expect(headers["X-XSRF-TOKEN"]).toBe("tok1")
    document.cookie = "XSRF-TOKEN=; path=/; max-age=0"
  })

  it("POST sem cookie XSRF faz antes um GET /api/auth/eu (ignorando o 401) e depois envia o header", async () => {
    document.cookie = "XSRF-TOKEN=; path=/; max-age=0"
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(async () => {
        document.cookie = "XSRF-TOKEN=emitido; path=/"
        return { ok: false, status: 401 }
      })
      .mockResolvedValueOnce({ ok: true, status: 204 })

    await apiFetch("/api/auth/login", { method: "POST", body: "{}" })

    const chamadas = (fetch as ReturnType<typeof vi.fn>).mock.calls
    expect(chamadas[0]?.[0]).toBe("/api/auth/eu")
    expect(chamadas[1]?.[0]).toBe("/api/auth/login")
    expect(chamadas[1]?.[1].headers["X-XSRF-TOKEN"]).toBe("emitido")
    document.cookie = "XSRF-TOKEN=; path=/; max-age=0"
  })

  it("GET nunca dispara o GET de preparo do cookie", async () => {
    document.cookie = "XSRF-TOKEN=; path=/; max-age=0"
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    await apiFetch("/api/qualquer")
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
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

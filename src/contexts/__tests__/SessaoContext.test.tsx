import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import type { ReactNode } from "react"
import { SessaoProvider, useSessao } from "../SessaoContext"

const usuario = {
  id: 7,
  email: "ana@example.com",
  nomeCompleto: "Ana Maria",
  nomeFormatoBlog: "Ana M.",
  papel: "CLIENTE",
}

function resposta(status: number, corpo?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(corpo),
  }
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessaoProvider>{children}</SessaoProvider>
)

describe("SessaoContext", () => {
  const originalFetch = globalThis.fetch
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    // o cookie que o boot (GET /api/auth/eu) emitiria; sem ele o apiFetch faria um GET extra antes do POST
    document.cookie = "XSRF-TOKEN=tok; path=/"
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
    document.cookie = "XSRF-TOKEN=; path=/; max-age=0"
    localStorage.clear()
  })

  it("boot com 401 em /api/auth/eu = anônimo, sem toast nem redirect", async () => {
    fetchMock.mockResolvedValue(
      resposta(401, { codigo: "nao_autenticado", mensagemPastoral: "Entre." })
    )
    const { result } = renderHook(() => useSessao(), { wrapper })
    expect(result.current.carregando).toBe(true)
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.usuario).toBeNull()
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/eu")
  })

  it("boot com sessão válida expõe o usuário (e não grava no localStorage)", async () => {
    fetchMock.mockResolvedValue(resposta(200, usuario))
    const { result } = renderHook(() => useSessao(), { wrapper })
    await waitFor(() => expect(result.current.usuario).toEqual(usuario))
    expect(localStorage.length).toBe(0)
  })

  it("login faz POST /api/auth/login com {email, senha} e guarda o usuário", async () => {
    fetchMock.mockResolvedValueOnce(resposta(401, {}))
    const { result } = renderHook(() => useSessao(), { wrapper })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    fetchMock.mockResolvedValueOnce(resposta(200, usuario))
    await act(async () => {
      await result.current.login("ana@example.com", "segredo")
    })
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit & { body: string }]
    expect(url).toBe("/api/auth/login")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ email: "ana@example.com", senha: "segredo" })
    expect(result.current.usuario).toEqual(usuario)
  })

  it("login com credenciais erradas lança e segue anônimo", async () => {
    fetchMock.mockResolvedValueOnce(resposta(401, {}))
    const { result } = renderHook(() => useSessao(), { wrapper })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    fetchMock.mockResolvedValueOnce(
      resposta(401, { codigo: "credenciais_invalidas", mensagemPastoral: "Não conferem." })
    )
    await expect(
      act(() => result.current.login("a@b.c", "x"))
    ).rejects.toMatchObject({ httpStatus: 401, pastoralMessage: "Não conferem." })
    expect(result.current.usuario).toBeNull()
  })

  it("logout chama o servidor e limpa, mesmo se o servidor falhar", async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, usuario))
    const { result } = renderHook(() => useSessao(), { wrapper })
    await waitFor(() => expect(result.current.usuario).not.toBeNull())

    fetchMock.mockResolvedValueOnce(resposta(204))
    await act(async () => {
      await result.current.logout()
    })
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(url).toBe("/api/auth/logout")
    expect(init.method).toBe("POST")
    expect(result.current.usuario).toBeNull()

    // falha de rede: limpa do mesmo jeito
    fetchMock.mockResolvedValueOnce(resposta(200, usuario))
    await act(async () => {
      await result.current.login("a@b.c", "x")
    })
    fetchMock.mockRejectedValueOnce(new Error("offline"))
    await act(async () => {
      await result.current.logout()
    })
    expect(result.current.usuario).toBeNull()
  })

  it("expirar() limpa o usuário e só devolve true na primeira vez", async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, usuario))
    const { result } = renderHook(() => useSessao(), { wrapper })
    await waitFor(() => expect(result.current.usuario).not.toBeNull())

    let a = false
    let b = true
    act(() => {
      a = result.current.expirar()
      b = result.current.expirar()
    })
    expect(a).toBe(true)
    expect(b).toBe(false)
    expect(result.current.usuario).toBeNull()
  })
})

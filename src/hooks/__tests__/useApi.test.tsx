import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import type { ReactNode } from "react"
import { toast } from "sonner"
import { SessaoProvider, useSessao } from "@/contexts/SessaoContext"
import { useApi } from "@/hooks/useApi"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const usuario = { id: 1, email: "a@b.c", nomeCompleto: "A", nomeFormatoBlog: "A", papel: "CLIENTE" }
const resp = (status: number, corpo?: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(corpo),
})

function setup(rota: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[rota]}>
      <SessaoProvider>{children}</SessaoProvider>
    </MemoryRouter>
  )
  return renderHook(
    () => ({ api: useApi(), sessao: useSessao(), loc: useLocation() }),
    { wrapper }
  )
}

describe("useApi", () => {
  const originalFetch = globalThis.fetch
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
    fetchMock = vi.fn((url: string) =>
      Promise.resolve(url === "/api/auth/eu" ? resp(200, usuario) : resp(401, {}))
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("401 limpa a sessão e vai para /login com o toast de sessão expirada", async () => {
    const { result } = setup("/conta")
    await waitFor(() => expect(result.current.sessao.usuario).not.toBeNull())

    await act(async () => {
      await result.current.api.fetchApi("/api/x").catch(() => {})
    })
    expect(result.current.sessao.usuario).toBeNull()
    expect(result.current.loc.pathname).toBe("/login")
    expect(toast.error).toHaveBeenCalledWith("Sua sessão expirou. Faça login pra continuar.")
  })

  it("401 em rota /admin vai para /admin/login", async () => {
    const { result } = setup("/admin/pedidos")
    await waitFor(() => expect(result.current.sessao.usuario).not.toBeNull())
    await act(async () => {
      await result.current.api.fetchApi("/api/x").catch(() => {})
    })
    expect(result.current.loc.pathname).toBe("/admin/login")
  })

  it("dois 401 simultâneos redirecionam e avisam uma vez só", async () => {
    const { result } = setup("/admin/pedidos")
    await waitFor(() => expect(result.current.sessao.usuario).not.toBeNull())
    await act(async () => {
      await Promise.allSettled([
        result.current.api.fetchApi("/api/a"),
        result.current.api.fetchApi("/api/b"),
      ])
    })
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(result.current.loc.pathname).toBe("/admin/login")
  })

  it("erro não-401 mostra o toast com a mensagem pastoral e relança", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/auth/eu"
          ? resp(200, usuario)
          : resp(403, { codigo: "proibido", mensagemPastoral: "Só o superusuário." })
      )
    )
    const { result } = setup("/admin")
    await waitFor(() => expect(result.current.sessao.usuario).not.toBeNull())
    await act(async () => {
      await expect(result.current.api.fetchApi("/api/x")).rejects.toMatchObject({
        code: "proibido",
        httpStatus: 403,
      })
    })
    expect(toast.error).toHaveBeenCalledWith("Só o superusuário.")
    expect(result.current.sessao.usuario).not.toBeNull()
  })

  it("showToast:false não exibe toast", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(resp(400, { detail: "x" })))
    const { result } = setup("/admin")
    await act(async () => {
      await result.current.api.fetchApi("/api/x", { showToast: false }).catch(() => {})
    })
    expect(toast.error).not.toHaveBeenCalled()
  })
})

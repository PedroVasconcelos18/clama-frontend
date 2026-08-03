import { renderHook, act, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import {
  CustomerAuthProvider,
  useCustomerAuth,
  type CustomerUser,
} from "@/contexts/CustomerAuthContext"
import * as apiModule from "@/lib/api"
import { PastoralApiError } from "@/lib/api"

const STORAGE_KEY = "clama:customer-auth"

const mockUser: CustomerUser = {
  id: 1,
  email: "fiel@example.com",
  nome_completo: "Pedro Henrique",
  force_change_password: false,
  freemium_used_at: null,
}

function wrapper({ children }: { children: ReactNode }) {
  return <CustomerAuthProvider>{children}</CustomerAuthProvider>
}

describe("CustomerAuthContext", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("login persists state to storage and returns the user", async () => {
    const apiSpy = vi.spyOn(apiModule, "apiFetch").mockResolvedValue({
      access: "access-1",
      refresh: "refresh-1",
      user: mockUser,
    })

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })

    let returned: CustomerUser | undefined
    await act(async () => {
      returned = await result.current.login("fiel@example.com", "senha123")
    })

    expect(apiSpy).toHaveBeenCalledWith(
      "/api/customer/auth/login/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "fiel@example.com",
          password: "senha123",
        }),
      }),
    )

    // login() now returns the User synchronously (P-9)
    expect(returned?.email).toBe("fiel@example.com")
    expect(returned?.force_change_password).toBe(false)

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe("fiel@example.com")

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
    expect(stored.user.email).toBe("fiel@example.com")
    // ADR-01: token nenhum no storage — vive em cookie HttpOnly.
    expect(stored.__accessTokenRemovido).toBeUndefined()
    expect(stored.refreshToken).toBeUndefined()
  })

  it("login returns user with force_change_password=true", async () => {
    vi.spyOn(apiModule, "apiFetch").mockResolvedValue({
      access: "access-1",
      refresh: "refresh-1",
      user: { ...mockUser, force_change_password: true },
    })

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })

    let returned: CustomerUser | undefined
    await act(async () => {
      returned = await result.current.login("fiel@example.com", "senha123")
    })

    expect(returned?.force_change_password).toBe(true)
  })

  it("logout chama /logout/ com credentials e limpa o storage", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: mockUser }),
    )

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 205 }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    await act(async () => {
      await result.current.logout()
    })

    // Duas chamadas: a busca do token de CSRF e o logout em si.
    const call = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("/api/customer/auth/logout/"),
    )!
    expect(call).toBeDefined()
    const url = call[0] as RequestInfo
    const init = call[1] as RequestInit
    expect(String(url)).toContain("/api/customer/auth/logout/")
    expect(init.method).toBe("POST")
    // ADR-01: sem header Authorization e sem refresh no corpo — a credencial
    // viaja no cookie HttpOnly, que exige `credentials: "include"`.
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(init.body).toBeUndefined()
    expect(init.credentials).toBe("include")

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("logout clears storage even when server returns 4xx (idempotent UX)", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: mockUser }),
    )

    // Simulate genuine 4xx — backend now returns 205 even on already-blacklisted,
    // so reaching here means a real error path. UX still clears local storage.
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 400 }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("refreshAccessToken renova a sessao sem tocar em token no cliente", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: mockUser }))

    const fetchSpy = vi
      .spyOn(apiModule, "apiFetch")
      .mockResolvedValue(undefined as never)

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    let renovou = false
    await act(async () => {
      renovou = await result.current.refreshAccessToken()
    })

    expect(renovou).toBe(true)
    // ADR-01: chamada sem corpo — o refresh vem do cookie, e a resposta
    // reemite os cookies. Nenhum token chega ao JavaScript.
    const [path, init] = fetchSpy.mock.calls[0]!
    expect(path).toBe("/api/customer/auth/refresh/")
    expect((init as RequestInit | undefined)?.body).toBeUndefined()

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
    expect(stored.accessToken).toBeUndefined()
  })

  it("refresh failure (401) logs out and clears storage", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: mockUser }),
    )

    vi.spyOn(apiModule, "apiFetch").mockRejectedValue(
      new PastoralApiError("Erro", "invalid_refresh", "Token inválido", 401),
    )

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    let renovou = true
    await act(async () => {
      renovou = await result.current.refreshAccessToken()
    })

    expect(renovou).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("loadAuthFromStorage rejeita blob sem user utilizavel", async () => {
    // Storage has only `user.email` — missing id, accessToken, refreshToken.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: { email: "x@example.com" } }),
    )

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })

    // Treats as logged-out and clears the storage.
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("loadAuthFromStorage aceita storage sem tokens (ADR-01)", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: mockUser }),
    )

    // Depois do ADR-01 o storage guarda só o `user`; a ausência de token não é
    // mais motivo de rejeição — é o formato correto.
    const { result } = renderHook(() => useCustomerAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(result.current.user?.email).toBe("fiel@example.com")
  })

  it("loadAuthFromStorage accepts valid full state (P-11 happy)", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: mockUser }),
    )

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(result.current.user?.email).toBe("fiel@example.com")
    // Storage stays intact
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })
})

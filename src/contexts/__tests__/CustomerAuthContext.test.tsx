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
  id: "u-1",
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
    expect(result.current.accessToken).toBe("access-1")

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
    expect(stored.user.email).toBe("fiel@example.com")
    expect(stored.accessToken).toBe("access-1")
    expect(stored.refreshToken).toBe("refresh-1")
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

  it("logout calls /logout/ with Bearer + refresh and clears storage", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: mockUser,
        accessToken: "access-1",
        refreshToken: "refresh-1",
      }),
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

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0]!
    const url = call[0] as RequestInfo
    const init = call[1] as RequestInit
    expect(String(url)).toContain("/api/customer/auth/logout/")
    expect(init.method).toBe("POST")
    // Critical: Authorization header must be present (P-1F).
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer access-1",
    )
    expect(init.body).toBe(JSON.stringify({ refresh: "refresh-1" }))

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("logout clears storage even when server returns 4xx (idempotent UX)", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: mockUser,
        accessToken: "access-1",
        refreshToken: "refresh-1",
      }),
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

  it("refreshAccessToken updates access token", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: mockUser,
        accessToken: "access-old",
        refreshToken: "refresh-1",
      }),
    )

    vi.spyOn(apiModule, "apiFetch").mockResolvedValue({
      access: "access-new",
    })

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })
    await waitFor(() => expect(result.current.accessToken).toBe("access-old"))

    let newToken: string | null = null
    await act(async () => {
      newToken = await result.current.refreshAccessToken()
    })

    expect(newToken).toBe("access-new")
    expect(result.current.accessToken).toBe("access-new")

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
    expect(stored.accessToken).toBe("access-new")
  })

  it("refresh failure (401) logs out and clears storage", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: mockUser,
        accessToken: "access-old",
        refreshToken: "refresh-1",
      }),
    )

    vi.spyOn(apiModule, "apiFetch").mockRejectedValue(
      new PastoralApiError("Erro", "invalid_refresh", "Token inválido", 401),
    )

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    let newToken: string | null = "should-not-be-this"
    await act(async () => {
      newToken = await result.current.refreshAccessToken()
    })

    expect(newToken).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("loadAuthFromStorage rejects partial JSON shape (P-11)", async () => {
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

  it("loadAuthFromStorage rejects missing tokens (P-11)", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: mockUser,
        accessToken: null,
        refreshToken: "refresh-1",
      }),
    )

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("loadAuthFromStorage accepts valid full state (P-11 happy)", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: mockUser,
        accessToken: "access-1",
        refreshToken: "refresh-1",
      }),
    )

    const { result } = renderHook(() => useCustomerAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(result.current.user?.email).toBe("fiel@example.com")
    // Storage stays intact
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })
})

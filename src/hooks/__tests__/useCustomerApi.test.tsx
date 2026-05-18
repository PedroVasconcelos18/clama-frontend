import { renderHook, act, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from "vitest"

import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext"
import { useCustomerApi } from "@/hooks/useCustomerApi"
import { PastoralApiError } from "@/lib/api"

const STORAGE_KEY = "clama:customer-auth"

const locationAssignMock = vi.fn()
const originalLocation = window.location
beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, assign: locationAssignMock },
  })
})
afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  })
})

const toastErrorMock = vi.fn()
vi.mock("sonner", async () => {
  const actual = await vi.importActual<typeof import("sonner")>("sonner")
  return {
    ...actual,
    toast: {
      ...actual.toast,
      error: (...args: unknown[]) => toastErrorMock(...args),
    },
  }
})

function setLoggedIn() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: {
        id: 1,
        email: "fiel@example.com",
        nome_completo: "Pedro",
        force_change_password: false,
        freemium_used_at: null,
      },
      accessToken: "access-old",
      refreshToken: "refresh-1",
    }),
  )
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <CustomerAuthProvider>{children}</CustomerAuthProvider>
    </MemoryRouter>
  )
}

describe("useCustomerApi", () => {
  beforeEach(() => {
    localStorage.clear()
    locationAssignMock.mockClear()
    toastErrorMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("two concurrent 401s share a single refresh and both retry (P-7)", async () => {
    setLoggedIn()

    let refreshCount = 0

    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : (input as Request).url
      const auth = String((init?.headers as Record<string, string>)?.Authorization ?? "")

      if (url.includes("/api/customer/auth/refresh/")) {
        refreshCount += 1
        return new Response(
          JSON.stringify({ access: "access-new" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }

      if (url.includes("/api/protected/foo/")) {
        if (auth === "Bearer access-old") {
          return new Response(
            JSON.stringify({ detail: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          )
        }
        if (auth === "Bearer access-new") {
          return new Response(
            JSON.stringify({ ok: true }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          )
        }
      }

      return new Response(null, { status: 404 })
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { result } = renderHook(() => useCustomerApi(), { wrapper })

    let r1: unknown, r2: unknown
    await act(async () => {
      const p1 = result.current.customerFetch<{ ok: boolean }>(
        "/api/protected/foo/",
        { method: "GET", showToast: false },
      )
      const p2 = result.current.customerFetch<{ ok: boolean }>(
        "/api/protected/foo/",
        { method: "GET", showToast: false },
      )
      const both = await Promise.all([p1, p2])
      r1 = both[0]
      r2 = both[1]
    })

    expect(refreshCount).toBe(1)
    expect(r1).toEqual({ ok: true })
    expect(r2).toEqual({ ok: true })
  })

  it("401 → refresh fails → logout + navigate /login + session-expired error (P-17)", async () => {
    setLoggedIn()

    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : (input as Request).url

      if (url.includes("/api/customer/auth/refresh/")) {
        // Refresh blacklisted → 401 from backend
        return new Response(
          JSON.stringify({ detail: "Token blacklisted" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        )
      }

      if (url.includes("/api/customer/auth/logout/")) {
        return new Response(null, { status: 205 })
      }

      if (url.includes("/api/protected/foo/")) {
        return new Response(
          JSON.stringify({ detail: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        )
      }

      return new Response(null, { status: 404 })
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { result } = renderHook(() => useCustomerApi(), { wrapper })

    let caught: unknown
    await act(async () => {
      try {
        await result.current.customerFetch("/api/protected/foo/", {
          method: "GET",
          showToast: false,
        })
      } catch (e) {
        caught = e
      }
    })

    // Threw a session-expired pastoral error
    expect(caught).toBeInstanceOf(PastoralApiError)
    const err = caught as PastoralApiError
    expect(err.code).toBe("session_expired")
    expect(err.httpStatus).toBe(401)

    // Storage cleared by refreshAccessToken's 401-handling path + logout()
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    // Routed to /login (hard nav — works in both react-router SPA and Vike pages)
    expect(locationAssignMock).toHaveBeenCalledWith("/login")
  })
})

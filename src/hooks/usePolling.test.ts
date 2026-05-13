import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { usePolling } from "./usePolling"

function tick(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

describe("usePolling", () => {
  it("chama fetcher imediatamente e popula data", async () => {
    const fetcher = vi.fn(async () => ({ count: 1 }))
    const { result } = renderHook(() =>
      usePolling(fetcher, { intervalMs: 60000, pauseWhenHidden: false }),
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.data).toEqual({ count: 1 }))
    expect(result.current.errorStreak).toBe(0)
  })

  it("faz polling em intervalMs após sucesso", async () => {
    const fetcher = vi.fn(async () => ({ count: 1 }))
    renderHook(() =>
      usePolling(fetcher, { intervalMs: 80, pauseWhenHidden: false }),
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    await tick(150)
    expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it("acumula errorStreak em erros consecutivos e aplica backoff", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("boom")
    })
    const { result } = renderHook(() =>
      usePolling(fetcher, {
        intervalMs: 200,
        pauseWhenHidden: false,
        backoffSequence: [50, 100, 200],
      }),
    )

    await waitFor(() => expect(result.current.errorStreak).toBe(1))
    await waitFor(() => expect(result.current.errorStreak).toBeGreaterThanOrEqual(2), {
      timeout: 2000,
    })
    expect(result.current.errorStreak).toBeGreaterThanOrEqual(2)
  })

  it("reseta errorStreak após sucesso", async () => {
    let shouldFail = true
    const fetcher = vi.fn(async () => {
      if (shouldFail) throw new Error("boom")
      return { ok: true }
    })

    const { result } = renderHook(() =>
      usePolling(fetcher, {
        intervalMs: 200,
        pauseWhenHidden: false,
        backoffSequence: [50],
      }),
    )

    await waitFor(() => expect(result.current.errorStreak).toBe(1))

    shouldFail = false
    await waitFor(() => expect(result.current.errorStreak).toBe(0), {
      timeout: 2000,
    })
    expect(result.current.data).toEqual({ ok: true })
  })

  it("não chama fetcher quando enabled=false", async () => {
    const fetcher = vi.fn(async () => ({ ok: true }))
    renderHook(() =>
      usePolling(fetcher, {
        intervalMs: 60000,
        enabled: false,
        pauseWhenHidden: false,
      }),
    )
    await tick(80)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("expõe refetch que força chamada imediata", async () => {
    const fetcher = vi.fn(async () => ({ ok: true }))
    const { result } = renderHook(() =>
      usePolling(fetcher, { intervalMs: 60000, pauseWhenHidden: false }),
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    await act(async () => {
      result.current.refetch()
      await tick(20)
    })
    await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2))
  })
})

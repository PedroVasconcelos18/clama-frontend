import { describe, it, expect, vi, afterEach } from "vitest"
import { triar } from "../api/triagem"

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("triar", () => {
  it("desiste em 12 s e devolve null", async () => {
    vi.useFakeTimers()
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))) // nunca resolve
    let r: boolean | null | undefined
    void triar("texto").then((v) => (r = v))
    await vi.advanceTimersByTimeAsync(11_900)
    expect(r).toBeUndefined()
    await vi.advanceTimersByTimeAsync(200)
    expect(r).toBeNull()
  })
})

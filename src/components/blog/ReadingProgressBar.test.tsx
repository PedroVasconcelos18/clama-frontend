import { render, screen, cleanup, act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReadingProgressBar } from "./ReadingProgressBar"

describe("ReadingProgressBar", () => {
  afterEach(() => {
    cleanup()
  })

  it("renderiza com role progressbar e valores ARIA", () => {
    render(<ReadingProgressBar />)
    const bar = screen.getByRole("progressbar", {
      name: /progresso de leitura/i,
    })
    expect(bar).toBeInTheDocument()
    expect(bar.getAttribute("aria-valuemin")).toBe("0")
    expect(bar.getAttribute("aria-valuemax")).toBe("100")
    expect(bar.getAttribute("aria-valuenow")).toBe("0")
  })

  it("atualiza progresso quando window dispara scroll", () => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true })
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      configurable: true,
    })
    Object.defineProperty(window, "innerHeight", {
      value: 1000,
      configurable: true,
    })

    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        cb(0)
        return 0
      })

    render(<ReadingProgressBar />)

    act(() => {
      ;(window as { scrollY: number }).scrollY = 500
      window.dispatchEvent(new Event("scroll"))
    })

    const bar = screen.getByRole("progressbar")
    expect(bar.getAttribute("aria-valuenow")).toBe("50")

    rafSpy.mockRestore()
  })
})

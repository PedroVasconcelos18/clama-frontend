import { render, screen, cleanup, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { PostEditor } from "./PostEditor"

describe("PostEditor", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it("renderiza toolbar + área de conteúdo com classes prose-clama", async () => {
    render(<PostEditor autosaveKey="test-key-1" initialContent="<p>oi</p>" />)

    await waitFor(() => {
      expect(
        screen.getByRole("toolbar", { name: /ferramentas do editor/i }),
      ).toBeInTheDocument()
    })

    const editor = document.querySelector('[data-slot="post-editor"]')
    expect(editor).not.toBeNull()
    expect(editor?.getAttribute("data-autosave-key")).toBe("test-key-1")

    // Confirma que o ProseMirror montou com o conteúdo inicial
    await waitFor(() => {
      const pm = document.querySelector(".ProseMirror")
      expect(pm).not.toBeNull()
      expect(pm?.textContent).toContain("oi")
    })
  })

  it("carrega rascunho de localStorage quando existe", async () => {
    localStorage.setItem(
      "test-key-2",
      JSON.stringify({
        html: "<p>rascunho salvo</p>",
        json: { type: "doc" },
      }),
    )

    render(<PostEditor autosaveKey="test-key-2" />)

    await waitFor(() => {
      const pm = document.querySelector(".ProseMirror")
      expect(pm?.textContent).toContain("rascunho salvo")
    })
  })

  it("inicia com data-dirty='false'", async () => {
    render(<PostEditor autosaveKey="test-key-3" />)

    await waitFor(() => {
      const editor = document.querySelector('[data-slot="post-editor"]')
      expect(editor?.getAttribute("data-dirty")).toBe("false")
    })
  })
})

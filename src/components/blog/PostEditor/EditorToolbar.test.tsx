import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Editor } from "@tiptap/core"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { afterEach, describe, expect, it } from "vitest"
import { EditorToolbar } from "./EditorToolbar"
import { VersiculoDestacado } from "./extensions/VersiculoDestacado"

function TestHost({
  onReady,
}: {
  onReady: (editor: Editor) => void
}) {
  const editor = useEditor({
    extensions: [StarterKit, Link, Image, VersiculoDestacado],
    content: "<p>Hello world</p>",
  })
  if (!editor) return null
  onReady(editor)
  return <EditorToolbar editor={editor} />
}

describe("EditorToolbar", () => {
  afterEach(() => {
    cleanup()
  })

  it("renderiza todos os botões com aria-labels descritivos em pt-br", () => {
    let _editor: Editor | null = null
    render(<TestHost onReady={(e) => (_editor = e)} />)

    expect(_editor).not.toBeNull()
    expect(screen.getByRole("toolbar", { name: /ferramentas do editor/i }))
      .toBeInTheDocument()

    const expectedLabels = [
      "Cabeçalho H2",
      "Cabeçalho H3",
      "Negrito",
      "Itálico",
      "Lista com marcadores",
      "Lista numerada",
      "Citação em bloco",
      "Inserir link",
      "Inserir imagem por URL",
      "Inserir versículo destacado",
    ]

    for (const label of expectedLabels) {
      expect(
        screen.getByRole("button", { name: label }),
      ).toBeInTheDocument()
    }
  })

  it("clicar em 'Negrito' alterna mark bold no editor", async () => {
    let editorRef: Editor | null = null
    render(<TestHost onReady={(e) => (editorRef = e)} />)

    const editor = editorRef!
    editor.commands.selectAll()
    expect(editor.isActive("bold")).toBe(false)

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Negrito" }))

    expect(editor.isActive("bold")).toBe(true)
  })

  it("abrir e confirmar modal 'Versículo' insere o node correto", async () => {
    let editorRef: Editor | null = null
    render(<TestHost onReady={(e) => (editorRef = e)} />)

    const user = userEvent.setup()
    await user.click(
      screen.getByRole("button", { name: "Inserir versículo destacado" }),
    )

    await user.type(
      screen.getByLabelText(/texto do versículo/i),
      "Porque Deus amou o mundo",
    )
    await user.type(
      screen.getByLabelText(/^referência$/i),
      "João 3:16",
    )

    await user.click(
      screen.getByRole("button", { name: /inserir versículo$/i }),
    )

    const editor = editorRef!
    const html = editor.getHTML()
    expect(html).toContain('class="versiculo"')
    expect(html).toContain('data-referencia="João 3:16"')
    expect(html).toContain('data-versao="ARC"')
    expect(html).toContain("Porque Deus amou o mundo")
  })
})

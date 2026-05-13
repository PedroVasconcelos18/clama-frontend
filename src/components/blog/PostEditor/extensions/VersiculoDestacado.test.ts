import { Editor } from "@tiptap/core"
import Document from "@tiptap/extension-document"
import Paragraph from "@tiptap/extension-paragraph"
import Text from "@tiptap/extension-text"
import { describe, expect, it } from "vitest"
import { VersiculoDestacado } from "./VersiculoDestacado"

function createEditor() {
  return new Editor({
    extensions: [Document, Paragraph, Text, VersiculoDestacado],
    content: "",
  })
}

describe("VersiculoDestacado (extension)", () => {
  it("setVersiculoDestacado insere node no JSON com attrs corretos", () => {
    const editor = createEditor()
    editor.commands.setVersiculoDestacado({
      referencia: "João 3:16",
      versao: "ARC",
      texto: "Porque Deus amou o mundo",
    })

    const json = editor.getJSON()
    const inserted = json.content?.find(
      (n) => n.type === "versiculoDestacado",
    )

    expect(inserted).toBeDefined()
    expect(inserted?.attrs).toEqual({
      referencia: "João 3:16",
      versao: "ARC",
    })
    expect(inserted?.content?.[0]).toEqual({
      type: "text",
      text: "Porque Deus amou o mundo",
    })

    editor.destroy()
  })

  it("renderiza HTML com <blockquote class='versiculo'> e data-attrs", () => {
    const editor = createEditor()
    editor.commands.setVersiculoDestacado({
      referencia: "Salmo 23:1",
      versao: "NVI",
      texto: "O Senhor é o meu pastor",
    })

    const html = editor.getHTML()
    expect(html).toContain('class="versiculo"')
    expect(html).toContain('data-referencia="Salmo 23:1"')
    expect(html).toContain('data-versao="NVI"')
    expect(html).toContain("O Senhor é o meu pastor")

    editor.destroy()
  })

  it("parseHTML reconhece blockquote.versiculo e popula attrs de data-*", () => {
    const editor = createEditor()
    editor.commands.setContent(
      '<blockquote class="versiculo" data-referencia="Romanos 8:28" data-versao="ACF">Sabemos</blockquote>',
    )

    const json = editor.getJSON()
    const node = json.content?.find((n) => n.type === "versiculoDestacado")

    expect(node).toBeDefined()
    expect(node?.attrs?.referencia).toBe("Romanos 8:28")
    expect(node?.attrs?.versao).toBe("ACF")

    editor.destroy()
  })
})

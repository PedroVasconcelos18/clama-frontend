import { Node, mergeAttributes } from "@tiptap/core"

export type VersiculoDestacadoAttrs = {
  referencia: string
  versao: string
}

export type SetVersiculoDestacadoArgs = VersiculoDestacadoAttrs & {
  texto: string
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    versiculoDestacado: {
      setVersiculoDestacado: (args: SetVersiculoDestacadoArgs) => ReturnType
      unsetVersiculoDestacado: () => ReturnType
    }
  }
}

export const VersiculoDestacado = Node.create({
  name: "versiculoDestacado",
  group: "block",
  content: "text*",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      referencia: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-referencia") ?? "",
        renderHTML: (attributes) => ({
          "data-referencia": attributes.referencia,
        }),
      },
      versao: {
        default: "ARC",
        parseHTML: (element) => element.getAttribute("data-versao") ?? "ARC",
        renderHTML: (attributes) => ({
          "data-versao": attributes.versao,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "blockquote.versiculo" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, { class: "versiculo" }),
      0,
    ]
  },

  addCommands() {
    return {
      setVersiculoDestacado:
        (args: SetVersiculoDestacadoArgs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { referencia: args.referencia, versao: args.versao },
            content: args.texto
              ? [{ type: "text", text: args.texto }]
              : [],
          }),
      unsetVersiculoDestacado:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    }
  },
})

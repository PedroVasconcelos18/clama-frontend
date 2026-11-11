import { describe, it, expect } from "vitest"
import { extractErrorMessage, extrairCampos, extrairCodigo } from "../erros"
import { getGenericError } from "@/i18n"

describe("erros", () => {
  it("prefere mensagemPastoral e expõe o codigo", () => {
    const body = {
      type: "about:blank",
      title: "Unauthorized",
      status: 401,
      detail: "Bad credentials",
      codigo: "credenciais_invalidas",
      mensagemPastoral: "E-mail ou senha não conferem.",
    }
    expect(extractErrorMessage(body)).toBe("E-mail ou senha não conferem.")
    expect(extrairCodigo(body)).toBe("credenciais_invalidas")
  })

  it("sem mensagemPastoral, junta as mensagens de erros[]", () => {
    const body = {
      status: 400,
      erros: [
        { campo: "email", mensagem: "E-mail inválido." },
        { campo: "senha", mensagem: "Senha curta demais." },
      ],
    }
    expect(extractErrorMessage(body)).toBe("E-mail inválido. Senha curta demais.")
  })

  it("sem os dois, usa detail", () => {
    expect(extractErrorMessage({ detail: "Algo específico", title: "Bad Request" })).toBe(
      "Algo específico",
    )
  })

  it("nunca concatena type/title: cai no genérico", () => {
    const msg = extractErrorMessage({ type: "about:blank", title: "Unauthorized", status: 401 })
    expect(msg).toBe(getGenericError())
    expect(msg).not.toContain("about:blank")
  })

  it("corpo inválido vira genérico e codigo ausente vira unknown", () => {
    expect(extractErrorMessage(null)).toBe(getGenericError())
    expect(extrairCodigo("texto")).toBe("unknown")
  })

  it("extrairCampos mapeia erros[] por campo e ignora lixo", () => {
    expect(
      extrairCampos({ erros: [{ campo: "nome", mensagem: "já existe" }, { campo: "nome", mensagem: "outra" }, { campo: "" }, 3] }),
    ).toEqual({ nome: "já existe" })
    expect(extrairCampos(null)).toEqual({})
  })
})

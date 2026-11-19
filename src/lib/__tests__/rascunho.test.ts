import { describe, it, expect, vi, afterEach } from "vitest"
import { lerRascunho, salvarRascunho, limparRascunho } from "../rascunho"

afterEach(() => {
  vi.restoreAllMocks()
  limparRascunho()
})

describe("rascunho", () => {
  it("salva e lê", () => {
    salvarRascunho({ tema: "luto", texto: "saudade", risco: false, consentAceito: true })
    expect(lerRascunho()).toEqual({ tema: "luto", texto: "saudade", risco: false, consentAceito: true })
  })

  it("limpa", () => {
    salvarRascunho({ tema: null, texto: "x", risco: null, consentAceito: true })
    limparRascunho()
    expect(lerRascunho()).toBeNull()
  })

  it("rascunhoFuncionaSemSessionStorage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    vi.spyOn(sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    salvarRascunho({ tema: null, texto: "sem storage", risco: true, consentAceito: true })
    expect(lerRascunho()).toEqual({ tema: null, texto: "sem storage", risco: true, consentAceito: true })
  })
})

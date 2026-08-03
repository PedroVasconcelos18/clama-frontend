import { describe, it, expect, beforeEach } from "vitest"
import { purgeLegacyTokens } from "../purgeLegacyTokens"

const RASCUNHO_PEDIDO = "clama:form-draft"
const RASCUNHO_POST = "blog-post-42"

describe("purgeLegacyTokens", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("remove os blobs de auth que ainda carregam token", () => {
    localStorage.setItem(
      "clama:customer-auth",
      JSON.stringify({ user: { id: 1 }, accessToken: "a", refreshToken: "r" }),
    )
    localStorage.setItem(
      "clama:admin-auth",
      JSON.stringify({ user: { id: 2 }, accessToken: "a", refreshToken: "r" }),
    )

    purgeLegacyTokens()

    expect(localStorage.getItem("clama:customer-auth")).toBeNull()
    expect(localStorage.getItem("clama:admin-auth")).toBeNull()
  })

  it("preserva sessao no formato novo, que nao tem token", () => {
    const novo = JSON.stringify({ user: { id: 1, email: "a@b.c" } })
    localStorage.setItem("clama:customer-auth", novo)

    purgeLegacyTokens()

    expect(localStorage.getItem("clama:customer-auth")).toBe(novo)
  })

  it("nao toca em nenhuma outra chave", () => {
    localStorage.setItem("locale", "pt-BR")
    localStorage.setItem(RASCUNHO_PEDIDO, JSON.stringify({ pedido: "em andamento" }))
    localStorage.setItem(RASCUNHO_POST, JSON.stringify({ html: "<p>rascunho</p>" }))
    localStorage.setItem(
      "clama:customer-auth",
      JSON.stringify({ user: { id: 1 }, accessToken: "a" }),
    )

    purgeLegacyTokens()

    // O pedido de oração em andamento é o que um `clear()` ou um sweep por
    // prefixo `clama:` destruiria — é o caso que esta story existe para não quebrar.
    expect(localStorage.getItem(RASCUNHO_PEDIDO)).not.toBeNull()
    expect(localStorage.getItem(RASCUNHO_POST)).not.toBeNull()
    expect(localStorage.getItem("locale")).toBe("pt-BR")
    expect(localStorage.getItem("clama:customer-auth")).toBeNull()
  })

  it("remove blob corrompido", () => {
    localStorage.setItem("clama:customer-auth", "{nao-e-json")
    purgeLegacyTokens()
    expect(localStorage.getItem("clama:customer-auth")).toBeNull()
  })
})

import { describe, expect, it } from "vitest"
import { gerarSlugDeTitulo, postFormSchema } from "./blog.types"

describe("postFormSchema", () => {
  const validBase = {
    titulo: "Um post sobre oração",
    slug: "um-post-sobre-oracao",
    historia_ilustrativa: false,
    conteudo_tiptap_json: { type: "doc" },
    conteudo_html: "<p>oi</p>",
  }

  it("aceita payload válido mínimo", () => {
    const result = postFormSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it("rejeita titulo curto", () => {
    const result = postFormSchema.safeParse({ ...validBase, titulo: "ai" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/3 caracteres/i)
    }
  })

  it("rejeita slug com maiúscula ou acento", () => {
    const bad = ["Slug-Maiusculo", "com-acéntu", "espaço aqui", "barra/aqui"]
    for (const slug of bad) {
      const result = postFormSchema.safeParse({ ...validBase, slug })
      expect(result.success).toBe(false)
    }
  })

  it("rejeita meta_title > 60 chars", () => {
    const result = postFormSchema.safeParse({
      ...validBase,
      meta_title: "x".repeat(61),
    })
    expect(result.success).toBe(false)
  })

  it("rejeita meta_description > 160 chars", () => {
    const result = postFormSchema.safeParse({
      ...validBase,
      meta_description: "x".repeat(161),
    })
    expect(result.success).toBe(false)
  })

  it("aceita imagem_capa_url vazia ou http(s)://", () => {
    expect(
      postFormSchema.safeParse({ ...validBase, imagem_capa_url: "" }).success,
    ).toBe(true)
    expect(
      postFormSchema.safeParse({
        ...validBase,
        imagem_capa_url: "https://exemplo.com/img.jpg",
      }).success,
    ).toBe(true)
    expect(
      postFormSchema.safeParse({
        ...validBase,
        imagem_capa_url: "naoehurl",
      }).success,
    ).toBe(false)
  })
})

describe("gerarSlugDeTitulo", () => {
  it.each([
    ["O Clamor que Nasce", "o-clamor-que-nasce"],
    ["Oração & Paz", "oracao-paz"],
    ["  espaços  no início  ", "espacos-no-inicio"],
    ["José sem cedilha", "jose-sem-cedilha"],
    ["Múltiplos---hífens", "multiplos-hifens"],
  ])("converte %s em %s", (input, expected) => {
    expect(gerarSlugDeTitulo(input)).toBe(expected)
  })
})

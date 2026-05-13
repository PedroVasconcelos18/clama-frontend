import { describe, expect, it } from "vitest"
import {
  SITE_URL,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildPostMeta,
  postCanonical,
} from "./seo"
import type { Post } from "@/types/blog.types"

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: "abc-123",
    titulo: "Sobre a oração que muda tudo",
    slug: "sobre-a-oracao-que-muda-tudo",
    conteudo_html: "<p>texto</p>",
    conteudo_tiptap_json: { type: "doc" },
    excerpt: "Um excerpt curto sobre oração.",
    meta_title: "",
    meta_description: "",
    imagem_capa_url: "",
    status: "publicado",
    data_publicacao: "2026-05-13T10:00:00Z",
    autor: { id: "u1", nome: "Pedro" },
    historia_ilustrativa: false,
    created_at: "2026-05-10T08:00:00Z",
    updated_at: "2026-05-13T09:00:00Z",
    ...overrides,
  }
}

describe("postCanonical", () => {
  it("monta URL sem trailing slash", () => {
    expect(postCanonical("post-x")).toBe("https://clama.me/blog/post-x")
  })
})

describe("buildPostMeta", () => {
  it("usa meta_title quando presente", () => {
    const meta = buildPostMeta(
      makePost({ meta_title: "SEO custom", titulo: "Titulo normal" }),
    )
    expect(meta.title).toBe("SEO custom")
  })

  it("fallback pra titulo quando meta_title vazio", () => {
    const meta = buildPostMeta(
      makePost({ meta_title: "", titulo: "Titulo normal" }),
    )
    expect(meta.title).toBe("Titulo normal")
  })

  it("trunca title em 60 chars com reticências", () => {
    const longTitle = "A".repeat(80)
    const meta = buildPostMeta(makePost({ titulo: longTitle }))
    expect(meta.title.length).toBeLessThanOrEqual(60)
    expect(meta.title.endsWith("…")).toBe(true)
  })

  it("usa meta_description quando presente, senão excerpt", () => {
    const m1 = buildPostMeta(
      makePost({ meta_description: "Desc SEO", excerpt: "exc" }),
    )
    expect(m1.description).toBe("Desc SEO")

    const m2 = buildPostMeta(
      makePost({ meta_description: "", excerpt: "Apenas excerpt" }),
    )
    expect(m2.description).toBe("Apenas excerpt")
  })

  it("trunca description em 160 chars", () => {
    const longDesc = "B".repeat(200)
    const meta = buildPostMeta(makePost({ meta_description: longDesc }))
    expect(meta.description.length).toBeLessThanOrEqual(160)
  })

  it("defaults ogType, ogLocale, twitterCard", () => {
    const meta = buildPostMeta(makePost())
    expect(meta.ogType).toBe("article")
    expect(meta.ogLocale).toBe("pt_BR")
    expect(meta.twitterCard).toBe("summary_large_image")
  })

  it("canonical aponta pro slug do post", () => {
    const meta = buildPostMeta(makePost({ slug: "meu-post" }))
    expect(meta.canonical).toBe("https://clama.me/blog/meu-post")
  })

  it("ogImage só presente se imagem_capa_url tem valor", () => {
    expect(buildPostMeta(makePost({ imagem_capa_url: "" })).ogImage).toBeUndefined()
    expect(
      buildPostMeta(makePost({ imagem_capa_url: "https://x/y.jpg" })).ogImage,
    ).toBe("https://x/y.jpg")
  })
})

describe("buildArticleJsonLd", () => {
  it("retorna JSON-LD Article válido", () => {
    const ld = buildArticleJsonLd(makePost())
    expect(ld["@context"]).toBe("https://schema.org")
    expect(ld["@type"]).toBe("Article")
    expect(ld.headline).toBe("Sobre a oração que muda tudo")
    expect(ld.author.name).toBe("Pedro")
    expect(ld.publisher.name).toBe("Clama")
    expect(ld.publisher.url).toBe(SITE_URL)
    expect(ld.mainEntityOfPage["@id"]).toBe(
      "https://clama.me/blog/sobre-a-oracao-que-muda-tudo",
    )
  })

  it("datePublished usa data_publicacao, fallback created_at", () => {
    expect(
      buildArticleJsonLd(makePost({ data_publicacao: "2026-01-01T00:00:00Z" }))
        .datePublished,
    ).toBe("2026-01-01T00:00:00Z")
    expect(
      buildArticleJsonLd(
        makePost({
          data_publicacao: null,
          created_at: "2025-12-31T00:00:00Z",
        }),
      ).datePublished,
    ).toBe("2025-12-31T00:00:00Z")
  })

  it("autor string vira author.name direto", () => {
    expect(
      buildArticleJsonLd(makePost({ autor: "Pedro V." })).author.name,
    ).toBe("Pedro V.")
  })

  it("autor faltando vira 'Equipe Clama'", () => {
    // @ts-expect-error simulando autor undefined
    expect(buildArticleJsonLd(makePost({ autor: undefined })).author.name).toBe(
      "Equipe Clama",
    )
  })
})

describe("buildBreadcrumbJsonLd", () => {
  it("monta breadcrumb Home → Blog → Post", () => {
    const ld = buildBreadcrumbJsonLd(makePost({ slug: "p1", titulo: "Post 1" }))
    expect(ld["@type"]).toBe("BreadcrumbList")
    expect(ld.itemListElement).toHaveLength(3)
    expect(ld.itemListElement[0]?.name).toBe("Início")
    expect(ld.itemListElement[0]?.item).toBe(SITE_URL)
    expect(ld.itemListElement[1]?.name).toBe("Blog")
    expect(ld.itemListElement[2]?.name).toBe("Post 1")
    expect(ld.itemListElement[2]?.item).toBe("https://clama.me/blog/p1")
  })
})

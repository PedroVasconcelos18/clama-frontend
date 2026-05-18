import type { Post } from "@/types/blog.types"

export const SITE_URL = "https://clama.me"

const TITLE_MAX = 60
const DESCRIPTION_MAX = 160

export type PostMetaConfig = {
  title: string
  description: string
  ogImage?: string
  ogType: "article"
  ogLocale: "pt_BR"
  twitterCard: "summary_large_image"
  canonical: string
}

export type JsonLdArticle = {
  "@context": "https://schema.org"
  "@type": "Article"
  headline: string
  description: string
  image?: string
  datePublished: string
  dateModified: string
  author: {
    "@type": "Person"
    name: string
  }
  publisher: {
    "@type": "Organization"
    name: string
    url: string
  }
  mainEntityOfPage: {
    "@type": "WebPage"
    "@id": string
  }
}

export type JsonLdBreadcrumbItem = {
  "@type": "ListItem"
  position: number
  name: string
  item: string
}

export type JsonLdBreadcrumb = {
  "@context": "https://schema.org"
  "@type": "BreadcrumbList"
  itemListElement: JsonLdBreadcrumbItem[]
}

function truncate(value: string, max: number): string {
  if (!value) return ""
  if (value.length <= max) return value
  return value.slice(0, max - 1).trimEnd() + "…"
}

function pickAutorNome(autor: Post["autor"]): string {
  if (typeof autor === "string") return autor
  return autor?.nome ?? "Equipe Clama"
}

export function postCanonical(slug: string): string {
  return `${SITE_URL}/blog/${slug}`
}

export function buildPostMeta(post: Post): PostMetaConfig {
  const rawTitle = post.meta_title || post.titulo
  const rawDescription = post.meta_description || post.excerpt || ""

  const meta: PostMetaConfig = {
    title: truncate(rawTitle, TITLE_MAX),
    description: truncate(rawDescription, DESCRIPTION_MAX),
    ogType: "article",
    ogLocale: "pt_BR",
    twitterCard: "summary_large_image",
    canonical: postCanonical(post.slug),
  }
  if (post.imagem_capa_url) {
    meta.ogImage = post.imagem_capa_url
  }
  return meta
}

export function buildArticleJsonLd(post: Post): JsonLdArticle {
  const dataPublicacao = post.data_publicacao ?? post.created_at
  const article: JsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.meta_title || post.titulo,
    description: post.meta_description || post.excerpt || "",
    datePublished: dataPublicacao,
    dateModified: post.updated_at,
    author: {
      "@type": "Person",
      name: pickAutorNome(post.autor),
    },
    publisher: {
      "@type": "Organization",
      name: "Clama",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postCanonical(post.slug),
    },
  }
  if (post.imagem_capa_url) {
    article.image = post.imagem_capa_url
  }
  return article
}

export function buildBreadcrumbJsonLd(post: Post): JsonLdBreadcrumb {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.titulo,
        item: postCanonical(post.slug),
      },
    ],
  }
}

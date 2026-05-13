import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAdminApi } from "@/hooks/useAdminApi"
import { PostEditor } from "@/components/blog/PostEditor/PostEditor"
import { PostPreview } from "@/components/blog/PostPreview"
import {
  postFormSchema,
  gerarSlugDeTitulo,
  type Post,
  type PostFormValues,
} from "@/types/blog.types"

const META_TITLE_MAX = 60
const META_DESCRIPTION_MAX = 160

type SaveButton = "draft" | "publish"

const EMPTY_VALUES: PostFormValues = {
  titulo: "",
  slug: "",
  excerpt: "",
  meta_title: "",
  meta_description: "",
  imagem_capa_url: "",
  historia_ilustrativa: false,
  conteudo_tiptap_json: { type: "doc" },
  conteudo_html: "",
}

function hasMissingAlt(html: string): boolean {
  // <img> sem alt OU com alt vazio
  const imgRegex = /<img\b[^>]*>/gi
  const matches = html.match(imgRegex) ?? []
  return matches.some((img) => !/\salt=("([^"]+)"|'([^']+)')/i.test(img))
}

export default function BlogPostEditorPage() {
  const { id: routeId } = useParams<{ id: string }>()
  const isEditing = Boolean(routeId)
  const navigate = useNavigate()
  const { adminFetch } = useAdminApi()

  const [postId, setPostId] = useState<string | undefined>(routeId)
  const [submitting, setSubmitting] = useState<SaveButton | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: EMPTY_VALUES,
  })

  // Carrega post existente em modo editar
  useEffect(() => {
    if (!routeId) return
    let cancelled = false
    ;(async () => {
      try {
        const post = await adminFetch<Post>(`/api/blog/posts/${routeId}/`)
        if (cancelled) return
        reset({
          titulo: post.titulo,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          meta_title: post.meta_title ?? "",
          meta_description: post.meta_description ?? "",
          imagem_capa_url: post.imagem_capa_url ?? "",
          historia_ilustrativa: Boolean(post.historia_ilustrativa),
          conteudo_tiptap_json: post.conteudo_tiptap_json ?? { type: "doc" },
          conteudo_html: post.conteudo_html ?? "",
        })
      } catch {
        /* useAdminApi já exibe toast */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [routeId, adminFetch, reset])

  // Auto-gera slug enquanto titulo muda E slug ainda não foi tocado manualmente
  const titulo = watch("titulo")
  const slugCurrent = watch("slug")
  useEffect(() => {
    if (!titulo || slugCurrent) return
    setValue("slug", gerarSlugDeTitulo(titulo), { shouldValidate: false })
  }, [titulo, slugCurrent, setValue])

  const metaTitleValue = watch("meta_title") ?? ""
  const metaDescriptionValue = watch("meta_description") ?? ""

  async function savePost(values: PostFormValues): Promise<Post> {
    const payload = {
      titulo: values.titulo,
      slug: values.slug,
      excerpt: values.excerpt || "",
      meta_title: values.meta_title || "",
      meta_description: values.meta_description || "",
      imagem_capa_url: values.imagem_capa_url || "",
      historia_ilustrativa: values.historia_ilustrativa,
      conteudo_tiptap_json: values.conteudo_tiptap_json,
    }
    if (postId) {
      return adminFetch<Post>(`/api/blog/posts/${postId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    }
    return adminFetch<Post>("/api/blog/posts/", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async function onSaveDraft(values: PostFormValues) {
    setSubmitting("draft")
    try {
      const post = await savePost(values)
      if (!postId) {
        setPostId(post.id)
        navigate(`/admin/blog/posts/${post.id}/editar`, { replace: true })
      }
      toast.success("Rascunho salvo.")
    } finally {
      setSubmitting(null)
    }
  }

  async function onPublish(values: PostFormValues) {
    if (hasMissingAlt(values.conteudo_html)) {
      toast.error(
        "Cada imagem no post precisa de texto alternativo antes de publicar.",
      )
      return
    }
    setSubmitting("publish")
    try {
      const post = await savePost(values)
      const idToPublish = post.id
      if (!postId) {
        setPostId(idToPublish)
      }
      await adminFetch(`/api/blog/posts/${idToPublish}/publicar/`, {
        method: "POST",
      })
      toast.info("Publicação iniciada — post no ar em ~3 minutos.")
      navigate(`/admin/blog/posts/${idToPublish}/editar`, { replace: true })
    } finally {
      setSubmitting(null)
    }
  }

  const previewMeta = {
    titulo: watch("titulo"),
  }

  const conteudoHtml = watch("conteudo_html")

  return (
    <div className="space-y-6 bg-clama-night-deep p-6 text-clama-cream">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-clama-gold">
          {isEditing ? "Editar post" : "Novo post"}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSubmit(onSaveDraft)}
            disabled={submitting !== null}
          >
            {submitting === "draft" ? "Salvando…" : "Salvar rascunho"}
          </Button>
          <Button
            variant="gold"
            onClick={handleSubmit(onPublish)}
            disabled={submitting !== null}
          >
            {submitting === "publish" ? "Publicando…" : "Publicar"}
          </Button>
        </div>
      </header>

      <section className="grid gap-4 rounded-md border border-clama-gold/20 bg-clama-night p-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="titulo" className="text-clama-cream">
            Título
          </Label>
          <Input
            id="titulo"
            {...register("titulo")}
            aria-invalid={errors.titulo ? true : undefined}
          />
          {errors.titulo && (
            <p className="text-sm text-destructive">{errors.titulo.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="slug" className="text-clama-cream">
            Slug (URL)
          </Label>
          <Input
            id="slug"
            {...register("slug")}
            aria-invalid={errors.slug ? true : undefined}
          />
          {errors.slug && (
            <p className="text-sm text-destructive">{errors.slug.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="excerpt" className="text-clama-cream">
            Resumo (excerpt)
          </Label>
          <Textarea
            id="excerpt"
            rows={2}
            {...register("excerpt")}
            aria-invalid={errors.excerpt ? true : undefined}
          />
          {errors.excerpt && (
            <p className="text-sm text-destructive">{errors.excerpt.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="meta_title" className="text-clama-cream">
            Meta título SEO{" "}
            <span className="text-xs text-clama-cream/60">
              ({metaTitleValue.length}/{META_TITLE_MAX})
            </span>
          </Label>
          <Input
            id="meta_title"
            {...register("meta_title")}
            aria-invalid={errors.meta_title ? true : undefined}
          />
          {errors.meta_title && (
            <p className="text-sm text-destructive">
              {errors.meta_title.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="imagem_capa_url" className="text-clama-cream">
            Imagem de capa (URL)
          </Label>
          <Input
            id="imagem_capa_url"
            type="url"
            {...register("imagem_capa_url")}
            aria-invalid={errors.imagem_capa_url ? true : undefined}
          />
          {errors.imagem_capa_url && (
            <p className="text-sm text-destructive">
              {errors.imagem_capa_url.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="meta_description" className="text-clama-cream">
            Meta descrição SEO{" "}
            <span className="text-xs text-clama-cream/60">
              ({metaDescriptionValue.length}/{META_DESCRIPTION_MAX})
            </span>
          </Label>
          <Textarea
            id="meta_description"
            rows={2}
            {...register("meta_description")}
            aria-invalid={errors.meta_description ? true : undefined}
          />
          {errors.meta_description && (
            <p className="text-sm text-destructive">
              {errors.meta_description.message}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <Label className="flex items-center gap-2 text-clama-cream">
            <input
              type="checkbox"
              {...register("historia_ilustrativa")}
              className="h-4 w-4"
            />
            <span>História ilustrativa (não relato literal)</span>
          </Label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium text-clama-cream/70">
            Editor
          </h2>
          <PostEditor
            autosaveKey={`blog-post-${postId ?? "new"}`}
            initialContent={{
              html: conteudoHtml,
              json: watch("conteudo_tiptap_json") as object,
            }}
            onChange={({ html, json }) => {
              setValue("conteudo_html", html, { shouldValidate: false })
              setValue("conteudo_tiptap_json", json, { shouldValidate: false })
            }}
          />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-medium text-clama-cream/70">
            Pré-visualização
          </h2>
          <PostPreview html={conteudoHtml} meta={previewMeta} />
        </div>
      </section>
    </div>
  )
}

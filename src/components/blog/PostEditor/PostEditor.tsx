import { useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { useFormDraft } from "@/hooks/useFormDraft"
import { cn } from "@/lib/utils"
import { EditorToolbar } from "./EditorToolbar"
import { VersiculoDestacado } from "./extensions/VersiculoDestacado"

export type PostEditorState = {
  html: string
  json: object
}

export type PostEditorProps = {
  autosaveKey: string
  initialContent?: PostEditorState | string
  onChange?: (state: PostEditorState) => void
  className?: string
}

const EMPTY_STATE: PostEditorState = { html: "", json: { type: "doc" } }
const ONCHANGE_DEBOUNCE_MS = 100

export function PostEditor({
  autosaveKey,
  initialContent,
  onChange,
  className,
}: PostEditorProps) {
  const initial: PostEditorState =
    typeof initialContent === "string"
      ? { html: initialContent, json: EMPTY_STATE.json }
      : (initialContent ?? EMPTY_STATE)

  const { value, setValue, clearDraft, isDirty } = useFormDraft<PostEditorState>(
    autosaveKey,
    initial,
  )

  const onChangeTimerRef = useRef<number | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      VersiculoDestacado,
    ],
    content: value.html || value.json,
    onUpdate({ editor }) {
      const next: PostEditorState = {
        html: editor.getHTML(),
        json: editor.getJSON(),
      }
      if (onChangeTimerRef.current) {
        clearTimeout(onChangeTimerRef.current)
      }
      onChangeTimerRef.current = window.setTimeout(() => {
        setValue(next)
        onChange?.(next)
      }, ONCHANGE_DEBOUNCE_MS)
    },
  })

  useEffect(() => {
    return () => {
      if (onChangeTimerRef.current) {
        clearTimeout(onChangeTimerRef.current)
      }
    }
  }, [])

  if (!editor) return null

  return (
    <div
      data-slot="post-editor"
      data-dirty={isDirty ? "true" : "false"}
      data-autosave-key={autosaveKey}
      className={cn("flex flex-col gap-2", className)}
    >
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-clama min-h-[24rem] rounded-md border border-clama-blog-border-soft bg-clama-blog-comment-bg p-4 [&_.ProseMirror]:outline-none"
      />
      {isDirty && (
        <button
          type="button"
          onClick={clearDraft}
          className="self-end text-xs text-muted-foreground underline hover:text-foreground"
        >
          Limpar rascunho salvo
        </button>
      )}
    </div>
  )
}

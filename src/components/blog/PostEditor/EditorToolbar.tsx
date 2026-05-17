import { useState } from "react"
import type { Editor } from "@tiptap/react"
// Side-effect imports: trazem augmentation de tipos dos commands (toggleBold,
// toggleHeading, setLink, unsetLink, setImage, etc.) pro ChainedCommands.
import "@tiptap/starter-kit"
import "@tiptap/extension-link"
import "@tiptap/extension-image"
import {
  Bold,
  BookOpen,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LinkDialog } from "./LinkDialog"
import { ImageUrlDialog } from "./ImageUrlDialog"
import { VersiculoDialog } from "./VersiculoDialog"

export type EditorToolbarProps = {
  editor: Editor
  className?: string
}

type ToolbarButtonConfig = {
  ariaLabel: string
  icon: React.ComponentType<{ "aria-hidden"?: boolean }>
  isActive: () => boolean
  onClick: () => void
}

function ToolbarButton({
  ariaLabel,
  icon: Icon,
  isActive,
  onClick,
}: ToolbarButtonConfig) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={ariaLabel}
      title={ariaLabel}
      data-state={isActive() ? "on" : "off"}
      className="data-[state=on]:bg-muted data-[state=on]:text-foreground"
      onClick={onClick}
    >
      <Icon aria-hidden />
    </Button>
  )
}

function Separator() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />
}

export function EditorToolbar({ editor, className }: EditorToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [versiculoOpen, setVersiculoOpen] = useState(false)

  return (
    <div
      role="toolbar"
      aria-label="Ferramentas do editor"
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-md border border-clama-gold/20 bg-clama-night-soft p-2 text-clama-cream",
        className,
      )}
    >
      <ToolbarButton
        ariaLabel="Cabeçalho H2"
        icon={Heading2}
        isActive={() => editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      />
      <ToolbarButton
        ariaLabel="Cabeçalho H3"
        icon={Heading3}
        isActive={() => editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      />
      <Separator />
      <ToolbarButton
        ariaLabel="Negrito"
        icon={Bold}
        isActive={() => editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        ariaLabel="Itálico"
        icon={Italic}
        isActive={() => editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <Separator />
      <ToolbarButton
        ariaLabel="Lista com marcadores"
        icon={List}
        isActive={() => editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        ariaLabel="Lista numerada"
        icon={ListOrdered}
        isActive={() => editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        ariaLabel="Citação em bloco"
        icon={Quote}
        isActive={() => editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <Separator />
      <ToolbarButton
        ariaLabel="Inserir link"
        icon={Link2}
        isActive={() => editor.isActive("link")}
        onClick={() => setLinkOpen(true)}
      />
      <ToolbarButton
        ariaLabel="Inserir imagem por URL"
        icon={ImageIcon}
        isActive={() => false}
        onClick={() => setImageOpen(true)}
      />
      <ToolbarButton
        ariaLabel="Inserir versículo destacado"
        icon={BookOpen}
        isActive={() => editor.isActive("versiculoDestacado")}
        onClick={() => setVersiculoOpen(true)}
      />

      <LinkDialog
        open={linkOpen}
        initialUrl={editor.getAttributes("link").href ?? ""}
        onCancel={() => setLinkOpen(false)}
        onConfirm={(url) => {
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
          setLinkOpen(false)
        }}
        onRemove={() => {
          editor.chain().focus().extendMarkRange("link").unsetLink().run()
          setLinkOpen(false)
        }}
      />
      <ImageUrlDialog
        open={imageOpen}
        onCancel={() => setImageOpen(false)}
        onConfirm={({ src, alt }) => {
          editor.chain().focus().setImage({ src, alt }).run()
          setImageOpen(false)
        }}
      />
      <VersiculoDialog
        open={versiculoOpen}
        onCancel={() => setVersiculoOpen(false)}
        onConfirm={({ texto, referencia, versao }) => {
          editor.commands.setVersiculoDestacado({ texto, referencia, versao })
          setVersiculoOpen(false)
        }}
      />
    </div>
  )
}

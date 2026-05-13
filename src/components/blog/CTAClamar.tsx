import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const ctaVariants = cva(
  "block rounded-lg text-center transition-all duration-200 [-webkit-tap-highlight-color:transparent]",
  {
    variants: {
      variant: {
        bottom:
          "bg-clama-gold py-10 px-6 hover:shadow-lg",
        "after-comments":
          "bg-clama-blog-gold-soft py-6 px-6 hover:shadow-md",
      },
    },
    defaultVariants: { variant: "bottom" },
  },
)

const copyVariants = cva("font-serif", {
  variants: {
    variant: {
      bottom: "text-[22px] text-clama-night",
      "after-comments": "text-base text-clama-blog-purple-prose",
    },
  },
  defaultVariants: { variant: "bottom" },
})

const buttonVariants = cva(
  "mt-4 inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        bottom:
          "bg-clama-night px-6 py-3 text-base text-clama-cream hover:bg-clama-night-soft",
        "after-comments":
          "bg-clama-blog-purple-prose px-4 py-2 text-sm text-clama-cream hover:opacity-90",
      },
    },
    defaultVariants: { variant: "bottom" },
  },
)

const COPY: Record<NonNullable<VariantProps<typeof ctaVariants>["variant"]>, {
  copy: string
  cta: string
}> = {
  bottom: {
    copy: "Sua dor merece uma oração escrita especialmente pra você.",
    cta: "Quero clamar →",
  },
  "after-comments": {
    copy: "Pronta pra clamar? Faça seu pedido →",
    cta: "Quero pedir uma oração",
  },
}

export type CTAClamarProps = VariantProps<typeof ctaVariants> & {
  href?: string
  className?: string
}

export function CTAClamar({
  variant = "bottom",
  href = "/",
  className,
}: CTAClamarProps) {
  const v = variant ?? "bottom"
  const { copy, cta } = COPY[v]
  return (
    <a
      href={href}
      rel="nofollow"
      aria-label="Quero pedir uma oração"
      data-slot="cta-clamar"
      data-variant={v}
      className={cn(ctaVariants({ variant: v }), className)}
    >
      <p className={copyVariants({ variant: v })}>{copy}</p>
      <span className={buttonVariants({ variant: v })}>{cta}</span>
    </a>
  )
}

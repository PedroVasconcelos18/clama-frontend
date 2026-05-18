import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

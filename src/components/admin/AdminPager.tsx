import { Button } from "@/components/ui/button"
import { PAGE_SIZE } from "@/hooks/useAdminList"

export function AdminPager({
  offset,
  total,
  onChange,
}: {
  offset: number
  total: number
  onChange: (offset: number) => void
}) {
  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between text-sm text-clama-cream/60">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))}
        >
          ← Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(offset + PAGE_SIZE)}
        >
          Próxima →
        </Button>
      </div>
    </div>
  )
}

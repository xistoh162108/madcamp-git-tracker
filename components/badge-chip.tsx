import { Award } from "lucide-react"
import { cn } from "@/lib/utils"

export function HonorTitleChip({
  label,
  desc,
  compact = false,
  className,
}: {
  label: string
  desc?: string
  compact?: boolean
  className?: string
}) {
  return (
    <span
      title={desc}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 font-semibold text-gold",
        compact ? "text-[10px]" : "text-[11px]",
        className,
      )}
    >
      <Award className="h-3 w-3" />
      {label}
    </span>
  )
}

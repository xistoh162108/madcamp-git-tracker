import { Award } from "lucide-react"
import { cn } from "@/lib/utils"
import { badgeDefs } from "@/lib/data"

interface BadgeChipProps {
  id: string
  className?: string
}

export function BadgeChip({ id, className }: BadgeChipProps) {
  const def = badgeDefs[id]
  if (!def) return null
  return (
    <span
      title={def.desc}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80",
        className,
      )}
    >
      <Award className="h-3 w-3 text-gold" />
      {def.label}
    </span>
  )
}

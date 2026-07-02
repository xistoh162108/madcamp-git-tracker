import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface RankChangeProps {
  rank: number
  prevRank: number
  className?: string
}

export function RankChange({ rank, prevRank, className }: RankChangeProps) {
  const delta = prevRank - rank // +면 상승

  if (delta === 0) {
    return (
      <span
        className={cn("inline-flex items-center gap-0.5 text-xs text-muted-foreground tabular", className)}
        aria-label="순위 변동 없음"
      >
        <Minus className="h-3 w-3" />
      </span>
    )
  }

  const up = delta > 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular",
        up ? "text-positive" : "text-destructive/90",
        className,
      )}
      aria-label={up ? `순위 ${delta}단계 상승` : `순위 ${Math.abs(delta)}단계 하락`}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(delta)}
    </span>
  )
}

import { ArrowUp, ArrowDown, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface RankChangeProps {
  rank: number
  prevRank: number
  isNew?: boolean
  className?: string
}

export function RankChange({ rank, prevRank, isNew, className }: RankChangeProps) {
  const delta = prevRank - rank // +면 상승

  if (isNew) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold tabular",
          className,
        )}
        aria-label="새로 순위에 진입"
      >
        <Sparkles className="h-3 w-3" />
        NEW
      </span>
    )
  }

  if (delta === 0) {
    return (
      <span
        className={cn("inline-flex items-center gap-0.5 text-xs text-muted-foreground tabular", className)}
        aria-label="순위 변동 없음"
      >
        =
      </span>
    )
  }

  const up = delta > 0
  const big = Math.abs(delta) >= 3
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular",
        big
          ? cn(
              "rounded-full px-1.5 py-0.5 text-xs font-bold",
              up ? "bg-positive/15 text-positive" : "bg-destructive/15 text-destructive",
            )
          : cn("text-xs font-medium", up ? "text-positive" : "text-destructive/90"),
        className,
      )}
      aria-label={up ? `순위 ${delta}단계 상승` : `순위 ${Math.abs(delta)}단계 하락`}
    >
      {up ? <ArrowUp className={big ? "h-3.5 w-3.5" : "h-3 w-3"} /> : <ArrowDown className={big ? "h-3.5 w-3.5" : "h-3 w-3"} />}
      {Math.abs(delta)}
    </span>
  )
}

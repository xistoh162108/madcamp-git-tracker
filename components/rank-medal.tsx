import { cn } from "@/lib/utils"

interface RankMedalProps {
  rank: number
  className?: string
}

// 순위 표시: 1~3위는 메달 컬러, 그 외는 차분한 숫자
export function RankMedal({ rank, className }: RankMedalProps) {
  const medal =
    rank === 1
      ? "border-gold/60 bg-gold/15 text-gold"
      : rank === 2
        ? "border-silver/50 bg-silver/15 text-silver"
        : rank === 3
          ? "border-bronze/50 bg-bronze/15 text-bronze"
          : "border-border bg-muted/40 text-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold tabular sm:h-8 sm:w-8 sm:text-sm",
        medal,
        rank === 1 && "rank-pulse medal-glow",
        rank > 1 && rank <= 3 && "medal-glow",
        className,
      )}
    >
      {rank}
    </span>
  )
}

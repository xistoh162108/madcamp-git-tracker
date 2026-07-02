import { Crown, Medal, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RankingMiniEntry {
  rank: number
  name: string
  commits: number
}

export interface RankingMiniCardProps {
  weekLabel: string
  classLabel?: string
  entries: RankingMiniEntry[]
  totalCommits: number
  activeParticipants: number
  updatedAtKst: string
  className?: string
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-3.5 w-3.5 text-gold" />
  if (rank === 2) return <Medal className="h-3.5 w-3.5 text-silver" />
  if (rank === 3) return <Medal className="h-3.5 w-3.5 text-bronze" />
  return <span className="w-3.5 text-center text-[11px] text-muted-foreground">{rank}</span>
}

export function RankingMiniCard({
  weekLabel,
  classLabel,
  entries,
  totalCommits,
  activeParticipants,
  updatedAtKst,
  className,
}: RankingMiniCardProps) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card/70 p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">
            몰입 랭킹 · {weekLabel}
            {classLabel ? ` · ${classLabel}` : ""}
          </p>
          <h2 className="mt-0.5 flex items-center gap-1.5 text-sm font-bold tracking-tight">
            <Trophy className="h-4 w-4 text-gold" />
            커밋 리그보드
          </h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-positive/25 bg-positive/10 px-2 py-0.5 text-[10px] font-medium text-positive">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
          LIVE
        </span>
      </div>

      <ol className="space-y-1.5">
        {entries.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border/60 bg-background/30 p-3 text-center text-xs text-muted-foreground">
            아직 집계된 활동이 없습니다.
          </li>
        ) : (
          entries.map((entry) => (
            <li
              key={entry.rank}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5",
                entry.rank <= 3 ? "bg-muted/30" : "",
              )}
            >
              <RankIcon rank={entry.rank} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.name}</span>
              <span className="shrink-0 font-mono text-xs font-semibold text-primary tabular">
                {entry.commits} commits
              </span>
            </li>
          ))
        )}
      </ol>

      <p className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        총 <span className="font-semibold text-foreground tabular">{totalCommits}</span> commits · 참여{" "}
        <span className="font-semibold text-foreground tabular">{activeParticipants}</span>명
        <span className="mx-1">·</span>
        업데이트 {updatedAtKst}
      </p>
    </section>
  )
}

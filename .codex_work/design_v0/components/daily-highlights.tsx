import { Sparkles, GitCommitHorizontal, Trophy, TrendingUp } from "lucide-react"
import { dailyHighlights, config } from "@/lib/data"

export function DailyHighlights() {
  if (!config.showDailyHighlights) return null

  const items = [
    { icon: GitCommitHorizontal, label: "오늘 커밋", value: `${dailyHighlights.todayCommits}개`, accent: "text-primary" },
    { icon: Trophy, label: "오늘 가장 활발한 팀", value: dailyHighlights.topTeamToday, accent: "text-gold", mono: true },
    { icon: TrendingUp, label: "최근 24시간 순위 상승", value: dailyHighlights.topMoverToday, accent: "text-positive" },
    { icon: Sparkles, label: "동기화 후 새 커밋", value: `+${dailyHighlights.newCommitsSinceSync}`, accent: "text-accent" },
  ]

  return (
    <section className="rounded-xl border border-border/70 bg-card/70 p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-accent" />
        {config.dailyHighlightsLabel}
        <span className="ml-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          최근 {config.dailyWindowHours}시간
        </span>
      </h3>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {items.map((it) => (
          <li key={it.label} className="rounded-lg border border-border/60 bg-background/40 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <it.icon className={`h-3.5 w-3.5 ${it.accent}`} />
              {it.label}
            </div>
            <p className={`mt-1 text-sm font-semibold ${it.mono ? "font-mono" : ""}`}>{it.value}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

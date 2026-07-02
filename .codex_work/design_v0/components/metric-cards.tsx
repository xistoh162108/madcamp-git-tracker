import { GitCommitHorizontal, FolderGit2, Users, Flame, Trophy, CalendarClock } from "lucide-react"
import { CountUp } from "@/components/count-up"
import { summary, config, weeks } from "@/lib/data"
import { cn } from "@/lib/utils"

interface Metric {
  label: string
  value?: number
  text?: string
  suffix?: string
  icon: React.ElementType
  accent?: string
}

export function MetricCards() {
  const activeWeek = weeks.find((w) => w.week === config.currentWeek)

  const metrics: Metric[] = [
    { label: "전체 커밋", value: summary.totalCommits, icon: GitCommitHorizontal, accent: "text-primary" },
    { label: "이번 주 커밋", value: summary.weekCommits, icon: Flame, accent: "text-accent" },
    { label: "활성 repository", value: summary.activeRepos, suffix: "개", icon: FolderGit2, accent: "text-foreground" },
    { label: "참여자 수", value: summary.participants, suffix: "명", icon: Users, accent: "text-foreground" },
    { label: "가장 활발한 팀", text: summary.topTeam, icon: Trophy, accent: "text-gold" },
    { label: "가장 활발한 분반", text: summary.topClass, icon: Flame, accent: "text-positive" },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border border-border/70 bg-card/70 p-3.5 transition-colors hover:border-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{m.label}</span>
            <m.icon className={cn("h-4 w-4", m.accent)} />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight tabular">
            {m.value !== undefined ? (
              <CountUp value={m.value} suffix={m.suffix} />
            ) : (
              <span className="font-mono text-xl">{m.text}</span>
            )}
          </div>
        </div>
      ))}
      <div className="col-span-2 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-3.5 md:col-span-3 xl:col-span-6">
        <CalendarClock className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm">
          <span className="text-muted-foreground">현재 주차 </span>
          <span className="font-semibold">{activeWeek?.label}</span>
          <span className="text-muted-foreground"> · 집계 기준 </span>
          <span className="font-semibold text-primary">KST</span>
          <span className="text-muted-foreground"> · 종료까지 </span>
          <span className="font-semibold">3일 04시간</span>
          <span className="text-muted-foreground"> 남음</span>
        </p>
      </div>
    </div>
  )
}

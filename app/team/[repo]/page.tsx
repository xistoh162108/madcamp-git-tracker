import path from "node:path"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Github, FileText, GitCommitHorizontal, Users, Clock, CalendarClock } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { InitialsAvatar } from "@/components/initials-avatar"
import { Notice } from "@/components/notice"
import { DailyLineChart, MemberBarChart } from "@/components/detail-charts"
import { repoNoticeText } from "@/lib/data"
import buildTimeSnapshot from "@/public/data/snapshots/latest.json"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"
import { loadConfig } from "@/src/config/load-config"
import { readSnapshotFallback } from "@/src/snapshot/fallback"

export const dynamic = "force-dynamic"

function fmtRepoShort(repo: string) {
  return repo.replace(/^.*?(w\d+-c\d+-\d+)$/, "$1")
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date)
}

export default async function TeamDetailPage({ params }: { params: Promise<{ repo: string }> }) {
  const { repo } = await params
  const config = loadConfig()
  const weekNumber = Number(repo.match(/^w(\d+)-/)?.[1])
  const weekConfig = config.weeks.find((week) => week.week === weekNumber)

  const snapshotPath = weekConfig
    ? path.join(process.cwd(), "public", "data", "snapshots", `${config.season}-w${weekNumber}.json`)
    : path.join(process.cwd(), "public", "data", "snapshots", "latest.json")
  const snapshot = readSnapshotFallback<AggregatedSnapshot>(
    snapshotPath,
    readSnapshotFallback<AggregatedSnapshot>(
      path.join(process.cwd(), "public", "data", "snapshots", "latest.json"),
      buildTimeSnapshot as AggregatedSnapshot,
    ),
  )
  const team = snapshot.rankings.teams.find((t) => fmtRepoShort(t.label) === repo || t.label === repo)
  if (!team) notFound()

  const short = fmtRepoShort(team.label)
  const teamFeed = snapshot.activityFeed.filter((item) => item.repoName === team.label)
  const memberMap = new Map<string, number>()
  for (const item of teamFeed) memberMap.set(item.label, (memberMap.get(item.label) ?? 0) + 1)
  const memberData = [...memberMap.entries()]
    .map(([name, commits]) => ({ name, commits }))
    .sort((a, b) => b.commits - a.commits)
  const avg = (team.averagePerPerson ?? team.commits / Math.max(1, memberData.length)).toFixed(1)

  const teamDayCounts = new Map<string, number>()
  for (const item of teamFeed) {
    const key = dateKey(new Date(item.committedAt))
    teamDayCounts.set(key, (teamDayCounts.get(key) ?? 0) + 1)
  }
  const weekTrend = weekConfig
    ? (() => {
        const days: { date: string; commits: number }[] = []
        const cursor = new Date(weekConfig.startAt)
        const end = new Date(weekConfig.endAt)
        while (cursor <= end) {
          const key = dateKey(cursor)
          days.push({ date: key.slice(5).replace("-", "."), commits: teamDayCounts.get(key) ?? 0 })
          cursor.setDate(cursor.getDate() + 1)
        }
        return days
      })()
    : snapshot.heatmap.slice(-7).map((day) => ({ date: day.date.slice(5).replace("-", "."), commits: day.count }))

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6 sm:py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 리더보드로 돌아가기
        </Link>

        {/* Header */}
        <div className="rounded-2xl border border-border/70 bg-card/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <Github className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-mono text-xl font-bold tracking-tight">{short}</h1>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{team.label}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">{team.meta}</span>
                  <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">
                    {weekNumber || "-"}주차
                  </span>
                  <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">
                    팀 #{short.split("-").pop()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="#"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs font-medium hover:bg-muted/40"
              >
                <FileText className="h-3.5 w-3.5" /> README
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Github className="h-3.5 w-3.5" /> Repository
              </a>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              icon={GitCommitHorizontal}
              label="팀 총 커밋"
              value={team.commits.toLocaleString()}
              accent="text-primary"
            />
            <Stat icon={Users} label="인당 평균" value={avg} accent="text-accent" />
            <Stat icon={CalendarClock} label="활동일" value={`${team.activeDays}일`} />
            <Stat
              icon={Clock}
              label="최근 활동"
              value={
                team.lastActivityAt
                  ? new Intl.DateTimeFormat("ko-KR", {
                      timeZone: "Asia/Seoul",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(team.lastActivityAt))
                  : "-"
              }
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <h2 className="text-sm font-semibold">팀원별 커밋 수</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{weekConfig?.label ?? `${weekNumber}주차`} · 한국 시간</p>
            <div className="mt-4">
              <MemberBarChart data={memberData} />
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <h2 className="text-sm font-semibold">날짜별 커밋 추이</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{weekConfig?.label ?? `${weekNumber}주차`} · 한국 시간</p>
            <div className="mt-4">
              <DailyLineChart data={weekTrend} />
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-border/70 bg-card/70 p-4">
          <h2 className="text-sm font-semibold">팀원</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {memberData
              .sort((a, b) => b.commits - a.commits)
              .map((m) => (
                <li
                  key={m.name}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-2.5"
                >
                  <InitialsAvatar name={m.name} githubUsername={m.name} size="sm" />
                  <span className="flex-1 text-sm font-medium">{m.name}</span>
                  <span className="text-sm font-bold tabular text-primary">{m.commits}</span>
                  <span className="text-[10px] text-muted-foreground">커밋</span>
                </li>
              ))}
          </ul>
        </section>

        <div className="mt-5 border-t border-border/60 pt-4">
          <Notice>{repoNoticeText}</Notice>
        </div>
      </main>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${accent ?? "text-muted-foreground"}`} />
        {label}
      </div>
      <p className={`mt-1 text-lg font-bold tabular ${accent ?? ""}`}>{value}</p>
    </div>
  )
}

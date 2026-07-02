import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Github, FileText, GitCommitHorizontal, Users, Clock, CalendarClock } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { InitialsAvatar } from "@/components/initials-avatar"
import { Notice } from "@/components/notice"
import { DailyLineChart, MemberBarChart } from "@/components/detail-charts"
import { teams, dailyTrend, fmtRepoShort, repoNoticeText } from "@/lib/data"

export default async function TeamDetailPage({ params }: { params: Promise<{ repo: string }> }) {
  const { repo } = await params
  const team = teams.find((t) => fmtRepoShort(t.repo) === repo)
  if (!team) notFound()

  const short = fmtRepoShort(team.repo)
  const avg = (team.commits / team.members.length).toFixed(1)
  // 팀원별 커밋 (총합을 분배한 예시)
  const weights = team.members.map((_, i) => 1 + ((i * 7 + 3) % 5) / 4)
  const wsum = weights.reduce((a, b) => a + b, 0)
  const memberData = team.members.map((m, i) => ({
    name: m,
    commits: Math.round((team.commits * weights[i]) / wsum),
  }))
  const weekTrend = dailyTrend.map((d, i) => ({ date: d.date, commits: Math.round(team.commits / 7 + (i % 3) * 6 - 6) }))

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6 sm:py-6">
        <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
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
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{team.repo}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">{team.class}</span>
                  <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">2주차</span>
                  <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">팀 #{short.split("-").pop()}</span>
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
            <Stat icon={GitCommitHorizontal} label="팀 총 커밋" value={team.commits.toLocaleString()} accent="text-primary" />
            <Stat icon={Users} label="인당 평균" value={avg} accent="text-accent" />
            <Stat icon={CalendarClock} label="활동일" value={`${team.activeDays}일`} />
            <Stat icon={Clock} label="최근 활동" value={team.lastActivity} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <h2 className="text-sm font-semibold">팀원별 커밋 수</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">2주차 · KST 기준</p>
            <div className="mt-4">
              <MemberBarChart data={memberData} />
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <h2 className="text-sm font-semibold">날짜별 커밋 추이</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">이번 주 · KST 기준</p>
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
                  <InitialsAvatar name={m.name} size="sm" />
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

import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Github, GitCommitHorizontal, CalendarClock, Hash } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { InitialsAvatar } from "@/components/initials-avatar"
import { BadgeChip } from "@/components/badge-chip"
import { Notice } from "@/components/notice"
import { ContributionHeatmap } from "@/components/contribution-heatmap"
import { DailyLineChart } from "@/components/detail-charts"
import { individuals, config, heatmap, contributionNoticeText } from "@/lib/data"

export default async function ParticipantDetailPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const p = individuals.find((i) => i.username === username)
  if (!p) notFound()

  const classNum = p.class.replace("분반", "")
  // 주차별 팀 이력 (예시)
  const weekHistory = [
    { week: "1주차", team: `2026-summer-w1-c${classNum}-0${((p.rank % 8) + 1)}`, commits: Math.round(p.commits * 0.9), status: "ended" as const },
    { week: "2주차", team: `2026-summer-${p.team}`, commits: p.commits, status: "active" as const },
    { week: "3주차", team: "예정", commits: 0, status: "upcoming" as const },
    { week: "4주차", team: "예정", commits: 0, status: "upcoming" as const },
  ]
  const totalCommits = weekHistory.reduce((a, w) => a + w.commits, 0)
  const trend = [
    { date: "07.09", commits: Math.round(p.commits / 7 + 2) },
    { date: "07.10", commits: Math.round(p.commits / 7 + 5) },
    { date: "07.11", commits: Math.round(p.commits / 7 - 1) },
    { date: "07.12", commits: Math.round(p.commits / 7 + 6) },
    { date: "07.13", commits: Math.round(p.commits / 7 - 3) },
    { date: "07.14", commits: Math.round(p.commits / 7 + 1) },
    { date: "07.15", commits: Math.round(p.commits / 7 + 3) },
  ]

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
              <InitialsAvatar name={p.name} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">{p.name}</h1>
                  <span className="rounded-md border border-gold/40 bg-gold/15 px-1.5 py-0.5 text-[11px] font-bold text-gold tabular">
                    현재 {p.rank}위
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">@{p.username}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">{p.class}</span>
                  <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono">{p.team}</span>
                </div>
              </div>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Github className="h-3.5 w-3.5" /> GitHub Profile
            </a>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={GitCommitHorizontal} label="전체 커밋" value={totalCommits.toLocaleString()} accent="text-primary" />
            <Stat icon={Hash} label="이번 주 커밋" value={p.commits.toLocaleString()} accent="text-accent" />
            <Stat icon={CalendarClock} label="이번 주 활동일" value={`${p.activeDays}일`} />
            <Stat icon={GitCommitHorizontal} label="최근 활동" value={p.lastActivity} />
          </div>

          {config.badgesEnabled && p.badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.badges.map((b) => (
                <BadgeChip key={b} id={b} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <h2 className="text-sm font-semibold">주차별 팀 이력</h2>
            <ul className="mt-3 space-y-2">
              {weekHistory.map((w) => (
                <li
                  key={w.week}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-2.5"
                >
                  <span className="w-12 text-xs font-semibold">{w.week}</span>
                  <span
                    className={`flex-1 truncate font-mono text-xs ${w.status === "upcoming" ? "text-muted-foreground" : "text-foreground/90"}`}
                  >
                    {w.team}
                  </span>
                  {w.status === "active" && (
                    <span className="rounded-full bg-positive/15 px-1.5 text-[9px] font-medium text-positive">진행 중</span>
                  )}
                  {w.status === "ended" && <span className="text-sm font-bold tabular">{w.commits}</span>}
                  {w.status === "active" && <span className="text-sm font-bold tabular text-primary">{w.commits}</span>}
                  {w.status === "upcoming" && <span className="text-xs text-muted-foreground">예정</span>}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <h2 className="text-sm font-semibold">이번 주 커밋 추이</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">KST 기준</p>
            <div className="mt-4">
              <DailyLineChart data={trend} />
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-border/70 bg-card/70 p-4">
          <h2 className="mb-4 text-sm font-semibold">개인 활동 heatmap</h2>
          <ContributionHeatmap grid={heatmap} />
        </section>

        <div className="mt-5 border-t border-border/60 pt-4">
          <Notice>{contributionNoticeText}</Notice>
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

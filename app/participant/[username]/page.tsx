import path from "node:path"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Github, GitCommitHorizontal, CalendarClock, Hash } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { AutoRefresh } from "@/components/auto-refresh"
import { InitialsAvatar } from "@/components/initials-avatar"
import { HonorTitleChip } from "@/components/badge-chip"
import { Notice } from "@/components/notice"
import { DailyLineChart, HourlyBarChart, SprintBoard } from "@/components/detail-charts"
import { contributionNoticeText } from "@/lib/data"
import buildTimeSnapshot from "@/public/data/snapshots/seed.json"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"
import { loadConfig } from "@/src/config/load-config"
import { readSnapshotFallback } from "@/src/snapshot/fallback"

export const dynamic = "force-dynamic"

function shortRepo(repo: string) {
  return repo.replace(/^.*?(w\d+-c\d+-\d+)$/, "$1")
}

function kstDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso))
}

function kstHour(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(new Date(iso))
}

function kstDateTime(iso?: string) {
  if (!iso) return "-"
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function repoClass(repo?: string) {
  return repo?.match(/w\d+-c(\d+)-\d+/)?.[1]
}

function rankingContext(
  entry: AggregatedSnapshot["rankings"]["personal"][number],
  entries: AggregatedSnapshot["rankings"]["personal"],
) {
  const sorted = [...entries].sort(
    (a, b) => b.commits - a.commits || Date.parse(b.lastActivityAt ?? "") - Date.parse(a.lastActivityAt ?? ""),
  )
  let previousCommits: number | null = null
  let previousRank = 0
  const ranked = sorted.map((item, index) => {
    const rank = previousCommits === item.commits ? previousRank : index + 1
    previousCommits = item.commits
    previousRank = rank
    return { ...item, displayRank: rank }
  })
  const current = ranked.find((item) => item.id === entry.id) ?? { ...entry, displayRank: entry.rank }
  const sameRank = ranked.filter((item) => item.commits === entry.commits)
  const nextGroup = ranked.find((item) => item.commits < entry.commits)
  const leader = ranked[0]
  const rankLabel = sameRank.length > 1 ? `공동 ${current.displayRank}위` : `${current.displayRank}위`
  const gapLabel =
    leader?.id === entry.id || entry.commits === leader?.commits
      ? nextGroup
        ? `다음 순위와 ${entry.commits - nextGroup.commits}커밋 차이`
        : "단독 선두"
      : `선두까지 ${(leader?.commits ?? entry.commits) - entry.commits}커밋`
  return { rankLabel, gapLabel }
}

export default async function ParticipantDetailPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const snapshot = readSnapshotFallback<AggregatedSnapshot>(
    path.join(process.cwd(), "public", "data", "snapshots", "latest.json"),
    buildTimeSnapshot as AggregatedSnapshot,
  )
  const config = loadConfig()
  const p = snapshot.rankings.personal.find((i) => i.meta === username || i.id === username)
  if (!p) notFound()

  const participantKey = p.meta ?? p.id
  const participantFeed = snapshot.activityFeed.filter((item) => item.label === participantKey || item.label === p.id)
  const activeTeam = participantFeed[0]?.repoName ?? snapshot.rankings.teams[0]?.label ?? "-"
  const activeTeamSlug = shortRepo(activeTeam)
  const activeClass = repoClass(activeTeam)
  const teamPeers = snapshot.rankings.personal.filter((entry) => {
    const entryKey = entry.meta ?? entry.id
    const entryRepo = snapshot.activityFeed.find((item) => item.label === entryKey || item.label === entry.id)?.repoName
    return entryRepo === activeTeam
  })
  const classPeers = snapshot.rankings.personal.filter((entry) => {
    const entryKey = entry.meta ?? entry.id
    const entryRepo = snapshot.activityFeed.find((item) => item.label === entryKey || item.label === entry.id)?.repoName
    return repoClass(entryRepo) === activeClass
  })
  const teamRank = Math.max(1, teamPeers.findIndex((entry) => entry.id === p.id) + 1)
  const classRank = Math.max(1, classPeers.findIndex((entry) => entry.id === p.id) + 1)
  const currentWeek = snapshot.currentWeek ?? 0
  const position = rankingContext(p, snapshot.rankings.personal)
  const weekHistory = config.weeks.map((week) => {
    const weekItems = participantFeed.filter((item) => item.repoName.includes(`-w${week.week}-`))
    const weekTeam = weekItems[0]?.repoName
    const status = week.week < currentWeek ? "ended" : week.week === currentWeek ? "active" : "upcoming"
    return {
      week: `${week.week}주차`,
      team: weekTeam ? shortRepo(weekTeam) : status === "upcoming" ? "예정" : "기록 없음",
      commits: weekItems.length,
      status,
    }
  })
  const participantCounts = new Map<string, number>()
  for (const item of participantFeed) {
    const date = kstDate(item.committedAt)
    participantCounts.set(date, (participantCounts.get(date) ?? 0) + 1)
  }
  const participantHeatmap = [...participantCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
  const trend = participantHeatmap
    .slice(-7)
    .map((day) => ({ date: day.date.slice(5).replace("-", "."), commits: day.count }))
  const hourlyCounts = new Map(Array.from({ length: 24 }, (_, hour) => [String(hour).padStart(2, "0"), 0]))
  for (const item of participantFeed) {
    const hour = kstHour(item.committedAt)
    hourlyCounts.set(hour, (hourlyCounts.get(hour) ?? 0) + 1)
  }
  const activeDayCount = Math.max(1, participantHeatmap.length)
  const hourly = [...hourlyCounts.entries()].map(([hour, commits]) => ({
    hour,
    commits: Math.round((commits / activeDayCount) * 10) / 10,
  }))
  const dailyAverage = p.activeDays > 0 ? (p.commits / p.activeDays).toFixed(1) : "0.0"
  const mostActiveHour = hourly.reduce(
    (best, item) => (item.commits > best.commits ? item : best),
    hourly[0] ?? { hour: "-", commits: 0 },
  )
  const showHourlyChart = p.commits >= 10

  return (
    <div className="min-h-screen">
      <AutoRefresh />
      <TopNav />
      <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6">
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
              <InitialsAvatar name={p.label} githubUsername={p.meta} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">{p.label}</h1>
                  <span className="rounded-md border border-gold/40 bg-gold/15 px-1.5 py-0.5 text-[11px] font-bold text-gold">
                    {position.rankLabel}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">@{p.meta ?? p.id}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {activeTeamSlug !== "-" ? (
                    <Link
                      href={`/team/${activeTeamSlug}`}
                      className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono hover:border-primary/50 hover:text-primary"
                    >
                      {activeTeamSlug}
                    </Link>
                  ) : (
                    <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono">-</span>
                  )}
                  <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary">
                    {position.gapLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  팀 내 {teamRank}위 / {Math.max(1, teamPeers.length)}명 · 분반 {classRank}위 /{" "}
                  {Math.max(1, classPeers.length)}명 · 전체 {position.rankLabel}
                </p>
              </div>
            </div>
            <a
              href={`https://github.com/${p.meta ?? p.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Github className="h-3.5 w-3.5" /> GitHub Profile
            </a>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              icon={GitCommitHorizontal}
              label="이번 주 커밋"
              value={`${p.commits} commits`}
              accent="text-primary"
            />
            <Stat icon={CalendarClock} label="이번 주 활동일" value={`${p.activeDays}일`} />
            <Stat icon={GitCommitHorizontal} label="최근 커밋" value={kstDateTime(p.lastActivityAt)} />
            <Stat
              icon={Hash}
              label="팀 내 순위"
              value={`${teamRank}위 / ${Math.max(1, teamPeers.length)}명`}
              accent="text-gold"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-border/60 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
            <span>
              분반 순위{" "}
              <span className="font-semibold text-foreground">
                {classRank}위 / {Math.max(1, classPeers.length)}명
              </span>
            </span>
            <span className="text-border">·</span>
            <span>
              하루 평균 <span className="font-semibold text-foreground">{dailyAverage} commits</span>
            </span>
            {p.activityStats ? (
              <>
                <span className="text-border">·</span>
                <span>
                  연속 활동 <span className="font-semibold text-foreground">{p.activityStats.currentDayStreak}일</span>
                </span>
              </>
            ) : null}
          </div>

          {p.honorTitles?.length ? (
            <div className="mt-4 border-t border-border/60 pt-4">
              <h2 className="text-sm font-semibold">칭호</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.honorTitles.map((title) => (
                  <HonorTitleChip key={title.id} label={title.label} desc={title.desc} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <h2 className="text-sm font-semibold">최근 커밋</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">KST 기준 · 원본 커밋 메시지</p>
            <ul className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {participantFeed.slice(0, 50).map((item) => {
                const hasStats =
                  item.additions !== undefined || item.deletions !== undefined || item.changedFiles !== undefined
                const branch = item.branches?.[0]
                return (
                  <li key={item.id} className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                    <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{kstDateTime(item.committedAt)}</span>
                      <span className="text-border">·</span>
                      <Link
                        href={`/team/${shortRepo(item.repoName)}`}
                        className="font-mono text-primary underline-offset-2 hover:underline"
                      >
                        {shortRepo(item.repoName)}
                      </Link>
                      {branch ? (
                        <>
                          <span className="text-border">·</span>
                          <span className="truncate font-mono">
                            🌿 {branch}
                            {(item.branches?.length ?? 0) > 1 ? ` +${item.branches!.length - 1}` : ""}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {item.commitUrl ? (
                      <a
                        href={item.commitUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block max-w-full truncate whitespace-nowrap text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {item.summary}
                      </a>
                    ) : (
                      <p className="mt-1 max-w-full truncate whitespace-nowrap text-sm font-medium text-foreground">
                        {item.summary}
                      </p>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      {hasStats ? (
                        <>
                          {item.additions !== undefined ? (
                            <span className="text-positive">+{item.additions}</span>
                          ) : null}
                          {item.deletions !== undefined ? (
                            <span className="text-destructive">-{item.deletions}</span>
                          ) : null}
                          {item.changedFiles !== undefined ? <span>{item.changedFiles} files</span> : null}
                        </>
                      ) : (
                        "변경 정보 없음"
                      )}
                    </p>
                  </li>
                )
              })}
              {participantFeed.length === 0 ? (
                <li className="rounded-lg border border-dashed border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
                  아직 표시할 커밋이 없습니다.
                </li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <h2 className="text-sm font-semibold">주차별 활동</h2>
            <ul className="mt-3 space-y-2">
              {weekHistory.map((w) => (
                <li
                  key={w.week}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-2.5"
                >
                  <span className="w-12 text-xs font-semibold">{w.week}</span>
                  {w.status === "active" && w.team !== "기록 없음" ? (
                    <Link
                      href={`/team/${w.team}`}
                      className="flex-1 truncate font-mono text-xs text-foreground/90 underline-offset-2 hover:text-primary hover:underline"
                    >
                      {w.team}
                    </Link>
                  ) : (
                    <span
                      className={`flex-1 truncate font-mono text-xs ${
                        w.status === "upcoming" ? "text-muted-foreground" : "text-foreground/90"
                      }`}
                    >
                      {w.team}
                    </span>
                  )}
                  {w.status === "active" && (
                    <span className="rounded-full bg-positive/15 px-1.5 text-[9px] font-medium text-positive">
                      진행 중
                    </span>
                  )}
                  {w.status === "ended" && <span className="text-sm font-bold tabular">{w.commits}</span>}
                  {w.status === "active" && <span className="text-sm font-bold tabular text-primary">{w.commits}</span>}
                  {w.status === "upcoming" && (
                    <span className="text-sm font-bold tabular text-muted-foreground">-</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <h2 className="text-sm font-semibold">일별 커밋 추이</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {trend[0]?.date && trend.at(-1)?.date ? `${trend[0].date} - ${trend.at(-1)!.date}` : "활동 없음"} · 개인
              활동
            </p>
            <div className="mt-4">
              <DailyLineChart data={trend} compact />
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <h2 className="text-sm font-semibold">4주 커밋 캘린더</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">캠프 기간 동안의 개인 활동 밀도</p>
            <div className="mt-4">
              <SprintBoard heatmap={participantHeatmap} weeks={config.weeks} currentWeek={snapshot.currentWeek} />
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-border/70 bg-card/70 p-4">
          <h2 className="text-sm font-semibold">시간대별 커밋 패턴</h2>
          {showHourlyChart ? (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground">KST 기준 · 활동일 평균 커밋 수</p>
              <div className="mt-4">
                <HourlyBarChart data={hourly} name="평균 커밋 수" />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              커밋 수가 적어 시간대 패턴은 참고용으로만 표시됩니다.
              {mostActiveHour.commits > 0 ? ` 현재 기록에서는 ${mostActiveHour.hour}시대 활동이 가장 많습니다.` : ""}
            </p>
          )}
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

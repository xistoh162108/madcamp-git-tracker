import path from "node:path"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Github,
  GitCommitHorizontal,
  CalendarClock,
  Hash,
  Sparkles,
  FileDiff,
  MessageSquareText,
} from "lucide-react"
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

// Sourced from entry.weeklyBreakdown (computed server-side from that participant's full commit
// list), not the capped activityFeed -- a participant whose most recent commit falls outside the
// camp-wide 200-item feed cap would otherwise be silently misattributed to no team (or the wrong
// one) here.
function repoForEntry(entry: AggregatedSnapshot["rankings"]["personal"][number], currentWeek: number) {
  return entry.weeklyBreakdown?.find((w) => w.week === currentWeek)?.repoName ?? entry.weeklyBreakdown?.at(-1)?.repoName
}

// Interpretive labels roughly mirror the scoring system's own size/file bands, so "적정" here
// lines up with what actually earns a good commit_score.
function changedLinesHint(avg: number) {
  if (avg <= 0) return undefined
  if (avg < 10) return "매우 작음"
  if (avg <= 300) return "적정"
  if (avg <= 800) return "다소 큼"
  return "매우 큼"
}

// A commit deep into a high-volume day's decay curve can round to "0.0" under a flat one-decimal
// format even though its real contribution is still positive -- that reads as "this commit was
// worth nothing," which is exactly the trust problem this page was built to avoid. Show more
// precision once the value would otherwise vanish, instead of ever displaying a real commit as 0.0.
function formatCommitScore(score: number) {
  if (score === 0) return "0.0"
  if (score < 0.05) return score.toFixed(3)
  if (score < 0.1) return score.toFixed(2)
  return score.toFixed(1)
}

function changedFilesHint(avg: number) {
  if (avg <= 0) return undefined
  if (avg <= 8) return "적정"
  if (avg <= 15) return "다소 넓음"
  return "넓음"
}

function messageFormatHint(rate: number) {
  if (rate >= 0.7) return "좋음"
  if (rate >= 0.4) return "양호"
  return "개선 필요"
}

function rankingContext(
  entry: AggregatedSnapshot["rankings"]["personal"][number],
  entries: AggregatedSnapshot["rankings"]["personal"],
) {
  // Score is the leaderboard's primary ranking metric -- this must match, or a participant's own
  // page would show a different rank than the leaderboard they came from.
  const scoreOf = (item: AggregatedSnapshot["rankings"]["personal"][number]) => item.score ?? 0
  const sorted = [...entries].sort(
    (a, b) => scoreOf(b) - scoreOf(a) || Date.parse(b.lastActivityAt ?? "") - Date.parse(a.lastActivityAt ?? ""),
  )
  let previousScore: number | null = null
  let previousRank = 0
  const ranked = sorted.map((item, index) => {
    const rank = previousScore === scoreOf(item) ? previousRank : index + 1
    previousScore = scoreOf(item)
    previousRank = rank
    return { ...item, displayRank: rank }
  })
  const current = ranked.find((item) => item.id === entry.id) ?? { ...entry, displayRank: entry.rank }
  const sameRank = ranked.filter((item) => scoreOf(item) === scoreOf(entry))
  const nextGroup = ranked.find((item) => scoreOf(item) < scoreOf(entry))
  const leader = ranked[0]
  const rankLabel = sameRank.length > 1 ? `공동 ${current.displayRank}위` : `${current.displayRank}위`
  const gapLabel =
    leader?.id === entry.id || scoreOf(entry) === (leader ? scoreOf(leader) : undefined)
      ? nextGroup
        ? `다음 순위와 ${(scoreOf(entry) - scoreOf(nextGroup)).toFixed(1)}점 차이`
        : "단독 선두"
      : `선두까지 ${((leader ? scoreOf(leader) : scoreOf(entry)) - scoreOf(entry)).toFixed(1)}점`
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

  const currentWeek = snapshot.currentWeek ?? 0
  const activeTeam = repoForEntry(p, currentWeek) ?? snapshot.rankings.teams[0]?.label ?? "-"
  const activeTeamSlug = shortRepo(activeTeam)
  const activeClass = repoClass(activeTeam)
  const teamPeers = snapshot.rankings.personal.filter((entry) => repoForEntry(entry, currentWeek) === activeTeam)
  const classPeers = snapshot.rankings.personal.filter(
    (entry) => repoClass(repoForEntry(entry, currentWeek)) === activeClass,
  )
  const teamRank = Math.max(1, teamPeers.findIndex((entry) => entry.id === p.id) + 1)
  const classRank = Math.max(1, classPeers.findIndex((entry) => entry.id === p.id) + 1)
  const position = rankingContext(p, snapshot.rankings.personal)
  const weekHistory = config.weeks.map((week) => {
    const weekData = p.weeklyBreakdown?.find((w) => w.week === week.week)
    const status = week.week < currentWeek ? "ended" : week.week === currentWeek ? "active" : "upcoming"
    return {
      week: `${week.week}주차`,
      team: weekData ? shortRepo(weekData.repoName) : status === "upcoming" ? "예정" : "기록 없음",
      commits: weekData?.commits ?? 0,
      status,
    }
  })
  const commitKindLabels: Record<string, string> = {
    normal: "일반",
    merge: "병합",
    empty: "빈 커밋",
    conflict_resolve: "충돌 해결",
    revert: "되돌리기",
    dependency_update: "의존성",
    lockfile_only: "락파일",
    formatting: "포맷팅",
    generated_files: "생성 파일",
    asset_only: "에셋",
    rename_only: "이름 변경",
  }
  // Sourced from p.commitKindBreakdown / p.heatmap (computed server-side from this participant's
  // full commit list), not participantFeed -- participantFeed is filtered from the global
  // activityFeed, which is capped at 200 most-recent commits camp-wide and would silently drop
  // this participant's older commits/days as total commit volume grows past that cap.
  const commitKindBreakdown = (p.commitKindBreakdown ?? [])
    .slice(0, 5)
    .map(({ kind, count }) => [kind, count] as [string, number])
  const participantHeatmap = p.heatmap ?? []
  const trend = participantHeatmap
    .slice(-7)
    .map((day) => ({ date: day.date.slice(5).replace("-", "."), commits: day.count }))
  // Sourced from p.hourlyDistribution (computed server-side from this participant's full commit
  // list), not participantFeed -- participantFeed is filtered from the global activityFeed, which
  // is capped at 200 most-recent commits and would silently drop this participant's older hours
  // as total commit volume grows past that cap.
  const hourly =
    p.hourlyDistribution ??
    Array.from({ length: 24 }, (_, hour) => ({
      hour: String(hour).padStart(2, "0"),
      commits: 0,
    }))
  const dailyAverage = p.activeDays > 0 ? (p.commits / p.activeDays).toFixed(1) : "0.0"
  const commitScoreSum = (p.recentCommits ?? []).reduce((sum, item) => sum + (item.score ?? 0), 0)
  const mostActiveHour = hourly.reduce(
    (best, item) => (item.commits > best.commits ? item : best),
    hourly[0] ?? { hour: "-", commits: 0 },
  )
  const showHourlyChart = p.commits >= 10

  return (
    <div className="min-h-screen">
      <AutoRefresh />
      <TopNav />
      <main className="mx-auto w-full max-w-[1280px] overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 리더보드로 돌아가기
        </Link>

        {/* Header */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
          <div className="flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <InitialsAvatar name={p.label} githubUsername={p.meta} size="lg" />
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="min-w-0 truncate text-xl font-bold tracking-tight">{p.label}</h1>
                  <span className="rounded-md border border-gold/40 bg-gold/15 px-1.5 py-0.5 text-[11px] font-bold text-gold">
                    전체 {position.rankLabel}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">@{p.meta ?? p.id}</p>
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
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  팀 내 {teamRank}위 / {Math.max(1, teamPeers.length)}명 · 분반 {classRank}위 /{" "}
                  {Math.max(1, classPeers.length)}명
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col items-start gap-2 sm:w-auto sm:items-end">
              <a
                href={`https://github.com/${p.meta ?? p.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Github className="h-3.5 w-3.5" /> GitHub Profile
              </a>
              <div className="text-left text-[11px] text-muted-foreground sm:text-right">
                <p className="font-semibold text-gold">{position.gapLabel}</p>
                <p>최근 활동 {kstDateTime(p.lastActivityAt)}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Sparkles} label="점수" value={(p.score ?? 0).toFixed(1)} accent="text-gold" />
            <Stat icon={CalendarClock} label="이번 주 활동일" value={`${p.activeDays}일`} />
            <Stat icon={GitCommitHorizontal} label="최근 커밋" value={kstDateTime(p.lastActivityAt)} />
            <Stat icon={Hash} label="팀 내 순위" value={`${teamRank}위 / ${Math.max(1, teamPeers.length)}명`} />
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap gap-x-3 gap-y-1 rounded-lg border border-border/40 bg-background/20 px-3 py-2 text-xs text-muted-foreground">
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
            <span className="text-border">·</span>
            <span>
              총 커밋 <span className="font-semibold text-foreground">{p.commits}</span> · 좋은 커밋{" "}
              <span className="font-semibold text-foreground">{p.qualifiedCommits ?? 0}</span>
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

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              icon={FileDiff}
              label="평균 변경 줄수"
              value={(p.avgChangedLines ?? 0).toFixed(1)}
              hint={changedLinesHint(p.avgChangedLines ?? 0)}
            />
            <Stat
              icon={FileDiff}
              label="평균 변경 파일수"
              value={(p.avgChangedFiles ?? 0).toFixed(1)}
              hint={changedFilesHint(p.avgChangedFiles ?? 0)}
            />
            <Stat
              icon={MessageSquareText}
              label="메시지 형식 사용률"
              value={`${Math.round((p.messageFormatRate ?? 0) * 100)}%`}
              hint={messageFormatHint(p.messageFormatRate ?? 0)}
            />
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

        <div className="mt-4 grid min-w-0 items-start gap-4 lg:grid-cols-[1.8fr_1fr]">
          <section className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4">
            <h2 className="text-sm font-semibold">최근 커밋</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              KST 기준 · 원본 커밋 메시지 · 점수는 페널티 반영된 실질 점수
            </p>
            {(p.rhythmBonusTotal ?? 0) > 0 || (p.consistencyBonus ?? 0) > 0 ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                커밋 점수 합 {commitScoreSum.toFixed(1)}점 + 리듬 보너스 {(p.rhythmBonusTotal ?? 0).toFixed(1)}점 + 꾸준함
                보너스 {(p.consistencyBonus ?? 0).toFixed(1)}점 = 총점 {(p.score ?? 0).toFixed(1)}점
              </p>
            ) : null}
            <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto pr-1">
              {(p.recentCommits ?? []).map((item) => {
                const hasStats =
                  item.additions !== undefined || item.deletions !== undefined || item.changedFiles !== undefined
                const branch = item.branches?.[0]
                return (
                  <li
                    key={item.id}
                    className="min-w-0 overflow-hidden rounded-lg border border-border/60 bg-background/40 p-2.5"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
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
                      {item.score !== undefined ? (
                        <span className="ml-auto shrink-0 font-mono font-semibold text-gold">
                          {formatCommitScore(item.score)}점
                        </span>
                      ) : null}
                    </p>
                  </li>
                )
              })}
              {(p.recentCommits ?? []).length === 0 ? (
                <li className="rounded-lg border border-dashed border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
                  아직 표시할 커밋이 없습니다.
                </li>
              ) : null}
            </ul>
          </section>

          <div className="flex min-w-0 flex-col gap-4">
            <section className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4">
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
                    {w.status === "active" && (
                      <span className="text-sm font-bold tabular text-primary">{w.commits}</span>
                    )}
                    {w.status === "upcoming" && (
                      <span className="text-sm font-bold tabular text-muted-foreground">-</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {commitKindBreakdown.length > 0 ? (
              <section className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4">
                <h2 className="text-sm font-semibold">커밋 유형 분포</h2>
                <ul className="mt-3 space-y-1.5">
                  {commitKindBreakdown.map(([kind, count]) => (
                    <li key={kind} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{commitKindLabels[kind] ?? kind}</span>
                      <span className="font-semibold tabular">{count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">일별 커밋 추이</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {trend[0]?.date && trend.at(-1)?.date ? `${trend[0].date} - ${trend.at(-1)!.date}` : "활동 없음"} ·
                  개인 활동
                </p>
              </div>
              {trend.length > 0 ? (
                <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                  <p className="font-semibold text-foreground tabular">
                    총 {trend.reduce((sum, day) => sum + day.commits, 0).toLocaleString()}
                  </p>
                  {trend.length >= 2 ? (
                    <p
                      className={
                        trend[trend.length - 1]!.commits - trend[trend.length - 2]!.commits >= 0
                          ? "text-positive"
                          : "text-destructive"
                      }
                    >
                      전일 대비 {trend[trend.length - 1]!.commits - trend[trend.length - 2]!.commits >= 0 ? "+" : ""}
                      {trend[trend.length - 1]!.commits - trend[trend.length - 2]!.commits}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="mt-4">
              <DailyLineChart data={trend} compact />
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4">
            <h2 className="text-sm font-semibold">4주 커밋 캘린더</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              각 칸은 하루를 의미하며, 색이 진할수록 커밋이 많습니다.
            </p>
            <div className="mt-4">
              <SprintBoard heatmap={participantHeatmap} weeks={config.weeks} currentWeek={snapshot.currentWeek} />
            </div>
          </section>
        </div>

        <section className="mt-4 min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold">시간대별 커밋 패턴</h2>
            {showHourlyChart && mostActiveHour.commits > 0 ? (
              <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                피크 {Number(mostActiveHour.hour)}시
              </span>
            ) : null}
          </div>
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
  hint,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: string
  hint?: string
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${accent ?? "text-muted-foreground"}`} />
        {label}
      </div>
      <p className={`mt-1 truncate text-lg font-bold tabular ${accent ?? ""}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

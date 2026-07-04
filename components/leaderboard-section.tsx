"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, ChevronRight, Crown, Flame, Medal } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RankMedal } from "@/components/rank-medal"
import { RankChange } from "@/components/rank-change"
import { InitialsAvatar } from "@/components/initials-avatar"
import { Notice } from "@/components/notice"
import { ScoringExplainerDialog } from "@/components/scoring-explainer"
import { WeekSelector } from "@/components/week-selector"
import {
  individuals,
  teams,
  classes,
  config,
  classNoticeText,
  repoNoticeText,
  scoringNoticeText,
  fmtRepoShort,
} from "@/lib/data"
import { cn } from "@/lib/utils"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"
import type { WeekConfig } from "@/src/config/schema"

type RankType = "individual" | "team" | "class"
type ClassMetric = "score" | "averagePerPerson" | "total"
type TeamMetric = "score" | "commits" | "averagePerPerson"

interface PersonalRow {
  rank: number
  displayRank?: number
  prevRank: number
  isNew: boolean
  name: string
  username: string
  class?: string
  team?: string
  commits: number
  score: number
  qualifiedCommits: number
  activeDays: number
  lastActivity: string
  honorTitles?: AggregatedSnapshot["rankings"]["personal"][number]["honorTitles"]
  activityStats?: AggregatedSnapshot["rankings"]["personal"][number]["activityStats"]
}

interface TeamRow {
  rank: number
  prevRank: number
  isNew: boolean
  repo: string
  class: string
  members: string[]
  externalCount: number
  botCount: number
  unknownCount: number
  commits: number
  score: number
  activeDays: number
  lastActivity: string
  averagePerPerson?: number
}

interface ClassRow {
  rank: number
  prevRank: number
  isNew: boolean
  className: string
  participants: number
  activeParticipants: number
  activeRepos: number
  totalCommits: number
  score: number
  averagePerPerson?: number
}

function formatActivity(iso?: string) {
  if (!iso) return "-"
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function repoMetaFromName(repoName?: string) {
  const match = repoName?.match(/w\d+-c(\d+)-(\d+)/)
  if (!match) return {}
  return {
    className: `${match[1]}분반`,
    teamName: `w${repoName!.match(/w(\d+)/)?.[1] ?? ""}-c${match[1]}-${match[2]}`,
  }
}

function personalRowsFromSnapshot(snapshot?: AggregatedSnapshot): PersonalRow[] {
  if (!snapshot)
    return individuals.map((i) => ({
      ...i,
      name: i.name,
      username: i.username,
      isNew: false,
      score: i.commits,
      qualifiedCommits: 0,
    }))
  return snapshot.rankings.personal.map((entry) => {
    const feedItem = snapshot.activityFeed.find((item) => item.label === entry.meta || item.label === entry.id)
    const repoMeta = repoMetaFromName(feedItem?.repoName)
    return {
      rank: entry.rank,
      prevRank: entry.prevRank,
      isNew: entry.isNew,
      name: entry.label,
      username: entry.meta ?? entry.id,
      class: repoMeta.className,
      team: repoMeta.teamName,
      commits: entry.commits,
      score: entry.score ?? 0,
      qualifiedCommits: entry.qualifiedCommits ?? 0,
      activeDays: entry.activeDays,
      lastActivity: formatActivity(entry.lastActivityAt),
      honorTitles: entry.honorTitles,
      activityStats: entry.activityStats,
    }
  })
}

function teamRowsFromSnapshot(snapshot?: AggregatedSnapshot): TeamRow[] {
  if (!snapshot)
    return teams.map((team) => ({
      ...team,
      isNew: false,
      externalCount: 0,
      botCount: 0,
      unknownCount: 0,
      score: team.commits,
    }))
  const knownParticipants = new Set(
    snapshot.rankings.personal.flatMap((entry) => [entry.id, entry.meta, entry.label].filter(Boolean) as string[]),
  )
  return snapshot.rankings.teams.map((entry) => {
    const repoItems = snapshot.activityFeed.filter((item) => item.repoName === entry.label)
    const participantMembers = entry.memberBreakdown?.length
      ? [...entry.memberBreakdown].sort((a, b) => b.score - a.score).map((member) => member.label)
      : [...new Set(repoItems.map((item) => item.label).filter((label) => label && knownParticipants.has(label)))]
    const externalActors = [
      ...new Set(repoItems.map((item) => item.label).filter((label) => label && !knownParticipants.has(label))),
    ]
    return {
      rank: entry.rank,
      prevRank: entry.prevRank,
      isNew: entry.isNew,
      repo: entry.label,
      class: entry.meta?.split(" · ")[0] ?? "-",
      members: participantMembers,
      externalCount: externalActors.length,
      botCount: repoItems.filter((item) => item.attributionStatus === "bot_only").length,
      unknownCount: repoItems.filter((item) => item.attributionStatus === "unknown").length,
      commits: entry.commits,
      score: entry.score ?? 0,
      activeDays: entry.activeDays,
      lastActivity: formatActivity(entry.lastActivityAt),
      averagePerPerson: entry.averagePerPerson,
    }
  })
}

function classRowsFromSnapshot(snapshot?: AggregatedSnapshot): ClassRow[] {
  if (!snapshot)
    return classes.map((classRow) => ({
      ...classRow,
      isNew: false,
      activeParticipants: classRow.participants,
      score: classRow.totalCommits,
    }))
  return snapshot.rankings.classes.map((entry) => ({
    rank: entry.rank,
    prevRank: entry.prevRank,
    isNew: entry.isNew,
    className: entry.label,
    participants: Number(entry.meta?.match(/\d+/)?.[0] ?? 0),
    activeParticipants: snapshot.rankings.personal.filter((person) => {
      const key = person.meta ?? person.id
      const repoName = snapshot.activityFeed.find((item) => item.label === key || item.label === person.id)?.repoName
      return repoMetaFromName(repoName).className === entry.label
    }).length,
    activeRepos: snapshot.rankings.teams.filter((team) => team.meta?.startsWith(entry.label)).length,
    totalCommits: entry.commits,
    score: entry.score ?? 0,
    averagePerPerson: entry.averagePerPerson,
  }))
}

function metricRank<T>(items: T[], valueOf: (item: T) => number) {
  const counts = items.reduce<Map<number, number>>((map, item) => {
    const value = valueOf(item)
    map.set(value, (map.get(value) ?? 0) + 1)
    return map
  }, new Map())
  let previousValue: number | null = null
  let previousRank = 0
  return items.map((item, index) => {
    const value = valueOf(item)
    const rank = previousValue === value ? previousRank : index + 1
    previousValue = value
    previousRank = rank
    return { item, value, rank, tied: (counts.get(value) ?? 0) > 1 }
  })
}

export function LeaderboardSection({
  snapshot,
  weeks,
  currentWeek,
  selectedWeekKey,
  onWeekSelect,
}: {
  snapshot?: AggregatedSnapshot
  weeks?: WeekConfig[]
  currentWeek?: number | null
  selectedWeekKey?: string
  onWeekSelect?: (key: string) => void
}) {
  const [type, setType] = useState<RankType>("individual")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [teamMetric, setTeamMetric] = useState<TeamMetric>("score")
  const [classMetric, setClassMetric] = useState<ClassMetric>("score")
  const personalData = useMemo(() => personalRowsFromSnapshot(snapshot), [snapshot])
  const teamData = useMemo(() => teamRowsFromSnapshot(snapshot), [snapshot])
  const classData = useMemo(() => classRowsFromSnapshot(snapshot), [snapshot])

  const filteredIndividuals = useMemo(
    () => personalData.filter((i) => classFilter === "all" || i.class === classFilter),
    [classFilter, personalData],
  )
  const filteredTeams = useMemo(
    () => teamData.filter((t) => classFilter === "all" || t.class === classFilter),
    [classFilter, teamData],
  )

  const teamSummary = useMemo(() => {
    if (filteredTeams.length === 0) return null
    const totalCommits = filteredTeams.reduce((sum, t) => sum + t.commits, 0)
    const avgActiveDays = filteredTeams.reduce((sum, t) => sum + t.activeDays, 0) / filteredTeams.length
    return { teamCount: filteredTeams.length, totalCommits, avgActiveDays }
  }, [filteredTeams])

  const sortedTeams = useMemo(() => {
    const arr = [...filteredTeams]
    if (teamMetric === "score") {
      arr.sort(
        (a, b) =>
          b.score - a.score ||
          b.commits - a.commits ||
          b.lastActivity.localeCompare(a.lastActivity) ||
          a.repo.localeCompare(b.repo),
      )
    } else if (teamMetric === "averagePerPerson") {
      arr.sort(
        (a, b) =>
          (b.averagePerPerson ?? b.commits / Math.max(1, b.members.length)) -
            (a.averagePerPerson ?? a.commits / Math.max(1, a.members.length)) ||
          b.commits - a.commits ||
          b.lastActivity.localeCompare(a.lastActivity) ||
          a.repo.localeCompare(b.repo),
      )
    } else {
      arr.sort(
        (a, b) =>
          b.commits - a.commits ||
          (b.averagePerPerson ?? 0) - (a.averagePerPerson ?? 0) ||
          b.lastActivity.localeCompare(a.lastActivity) ||
          a.repo.localeCompare(b.repo),
      )
    }
    return arr
  }, [filteredTeams, teamMetric])

  const sortedClasses = useMemo(() => {
    const arr = [...classData]
    if (classMetric === "score") {
      arr.sort((a, b) => b.score - a.score || b.totalCommits - a.totalCommits || a.className.localeCompare(b.className))
    } else if (classMetric === "averagePerPerson") {
      arr.sort(
        (a, b) =>
          (b.averagePerPerson ?? b.totalCommits / Math.max(1, b.participants)) -
            (a.averagePerPerson ?? a.totalCommits / Math.max(1, a.participants)) ||
          b.totalCommits - a.totalCommits ||
          a.className.localeCompare(b.className),
      )
    } else {
      arr.sort(
        (a, b) =>
          b.totalCommits - a.totalCommits ||
          (b.averagePerPerson ?? 0) - (a.averagePerPerson ?? 0) ||
          a.className.localeCompare(b.className),
      )
    }
    return arr
  }, [classMetric, classData])

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-w-0 overflow-x-hidden rounded-2xl border border-border/70 bg-card/40 p-3 sm:p-4"
    >
      {/* Tabs + filters */}
      <div className="flex flex-col gap-3">
        <Tabs value={type} onValueChange={(v) => setType(v as RankType)}>
          <TabsList className="h-9 bg-muted/50">
            <TabsTrigger value="individual" className="text-xs data-[state=active]:bg-background">
              개인 랭킹
            </TabsTrigger>
            <TabsTrigger value="team" className="text-xs data-[state=active]:bg-background">
              팀 랭킹
            </TabsTrigger>
            <TabsTrigger value="class" className="text-xs data-[state=active]:bg-background">
              분반 랭킹
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <WeekSelector
          configuredWeeks={weeks}
          currentWeek={currentWeek}
          selectedKey={selectedWeekKey}
          onSelect={onWeekSelect}
        />

        <div className="flex flex-wrap items-center gap-2">
          {type !== "class" && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="분반" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분반</SelectItem>
                {config.classes.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {type === "team" && (
            <div className="ml-auto inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                onClick={() => setTeamMetric("score")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  teamMetric === "score" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                점수
              </button>
              <button
                onClick={() => setTeamMetric("averagePerPerson")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  teamMetric === "averagePerPerson"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                인당 평균
              </button>
              <button
                onClick={() => setTeamMetric("commits")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  teamMetric === "commits" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                총 커밋
              </button>
            </div>
          )}

          {type === "class" && (
            <div className="ml-auto inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                onClick={() => setClassMetric("score")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  classMetric === "score" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                평균 점수
              </button>
              <button
                onClick={() => setClassMetric("averagePerPerson")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  classMetric === "averagePerPerson"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                인당 평균
              </button>
              <button
                onClick={() => setClassMetric("total")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  classMetric === "total" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                총 커밋
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 min-h-[74px]">
        {type === "individual" ? (
          <RankingRule>개인 랭킹은 개발 리듬 점수 기준입니다. 동점은 공동 순위로 표시합니다.</RankingRule>
        ) : null}
        {type === "team" ? (
          <>
            <RankingRule>
              {teamMetric === "score"
                ? "개발 리듬 점수 기준 정렬 · 커밋 크기·메시지 품질·꾸준함을 반영합니다. 동점은 공동 순위로 표시합니다."
                : teamMetric === "commits"
                  ? "총 커밋 기준 정렬 · 동점은 공동 순위로 표시하고 보조 기준은 인당 평균, 최근 활동순입니다."
                  : "인당 평균 기준 정렬 · 동점은 공동 순위로 표시하고 보조 기준은 총 커밋, 최근 활동순입니다."}
            </RankingRule>
            {teamSummary ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                이번 주 총 <span className="font-semibold text-foreground tabular">{teamSummary.teamCount}</span>팀 · 총{" "}
                <span className="font-semibold text-foreground tabular">
                  {teamSummary.totalCommits.toLocaleString()}
                </span>
                커밋 · 평균 활동일{" "}
                <span className="font-semibold text-foreground tabular">{teamSummary.avgActiveDays.toFixed(1)}</span>일
              </p>
            ) : null}
          </>
        ) : null}
        {type === "class" ? (
          <RankingRule>
            {classMetric === "score"
              ? "등록 참가자 기준 평균 개발 리듬 점수로 정렬합니다. 동점은 공동 순위로 표시하고 보조 기준은 총 커밋입니다."
              : classMetric === "averagePerPerson"
                ? "등록 참가자 수 기준 인당 평균으로 정렬합니다. 동점은 공동 순위로 표시하고 보조 기준은 총 커밋입니다."
                : "총 커밋 기준 정렬 · 동점은 공동 순위로 표시하고 보조 기준은 인당 평균입니다."}
          </RankingRule>
        ) : null}
      </div>

      {/* Rows */}
      <AnimatePresence mode="wait">
        <motion.div
          key={type}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="mt-3 h-[560px] space-y-1.5 overflow-y-auto pr-1"
        >
          {type === "individual" && <IndividualRows data={filteredIndividuals.slice(0, 50)} />}
          {type === "team" && <TeamRows data={sortedTeams.slice(0, 50)} metric={teamMetric} />}
          {type === "class" && <ClassRows data={sortedClasses.slice(0, 50)} metric={classMetric} />}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Notice className="flex-1">{scoringNoticeText}</Notice>
          <ScoringExplainerDialog />
        </div>
        {type === "class" ? <Notice>{classNoticeText}</Notice> : <Notice>{repoNoticeText}</Notice>}
      </div>
    </motion.section>
  )
}

function RankingRule({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-border/60 bg-background/35 px-3 py-2 text-[11px] text-muted-foreground">
      {children}
    </p>
  )
}

function RowShell({ children, href, index = 0 }: { children: React.ReactNode; href?: string; index?: number }) {
  const base =
    "group relative flex items-center gap-2 overflow-hidden rounded-lg border border-border/50 bg-card/60 px-2.5 py-2.5 transition-colors hover:border-primary/40 hover:bg-card sm:gap-3 sm:px-3"
  const motionProps = {
    initial: { opacity: 0, y: 8, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.24, delay: index * 0.028 },
    whileHover: { x: 4, scale: 1.006 },
    whileTap: { scale: 0.995 },
  }
  return href ? (
    <motion.div {...motionProps}>
      <Link href={href} className={base}>
        <span className="absolute inset-x-0 top-0 h-px bg-primary/0 transition-colors group-hover:bg-primary/60" />
        {children}
      </Link>
    </motion.div>
  ) : (
    <motion.div {...motionProps} className={base}>
      <span className="absolute inset-x-0 top-0 h-px bg-primary/0 transition-colors group-hover:bg-primary/60" />
      {children}
    </motion.div>
  )
}

function RankTierBadge({
  rank,
  rankDelta = 0,
  totalCount,
}: {
  rank: number
  /** prevRank - rank; positive means the row moved up. Only a genuinely notable jump earns a badge. */
  rankDelta?: number
  totalCount?: number
}) {
  if (totalCount !== undefined && totalCount < 5 && rank > 1) return null
  const tier =
    rank === 1
      ? { label: "선두 그룹", icon: Crown, cls: "border-gold/25 bg-gold/10 text-gold" }
      : rank <= 3
        ? { label: "상위권", icon: Medal, cls: "border-primary/25 bg-primary/10 text-primary" }
        : rankDelta >= 3
          ? { label: "상승 중", icon: ArrowUpRight, cls: "border-positive/25 bg-positive/10 text-positive" }
          : null
  if (!tier) return null
  return (
    <span
      className={cn(
        "hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-normal sm:inline-flex",
        tier.cls,
      )}
    >
      <tier.icon className="h-3 w-3" />
      {tier.label}
    </span>
  )
}

function scoreGapLabel(gap: number) {
  return `선두까지 ${gap.toFixed(1)}점`
}

function MomentumBar({ value, max, tone = "primary" }: { value: number; max: number; tone?: "primary" | "gold" }) {
  const width = `${Math.max(6, Math.round((value / Math.max(1, max)) * 100))}%`
  return (
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/30">
      <motion.div
        className={cn(
          "progress-glint relative h-full overflow-hidden rounded-full opacity-70",
          tone === "gold" ? "bg-gold" : "bg-primary",
        )}
        initial={{ width: 0 }}
        animate={{ width }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

function LeaderGapLabel({ status, className }: { status: string; className?: string }) {
  return <p className={cn("mt-1 text-[10px] text-muted-foreground", className)}>{status}</p>
}

function IndividualRows({ data }: { data: PersonalRow[] }) {
  const maxScore = Math.max(1, ...data.map((item) => item.score))
  const leaderScore = maxScore
  // scores are floats, so round before using as a tie-detection key to avoid spurious near-miss mismatches
  const scoreCounts = data.reduce<Map<number, number>>((map, item) => {
    const key = Math.round(item.score * 100)
    map.set(key, (map.get(key) ?? 0) + 1)
    return map
  }, new Map())
  let previousScore: number | null = null
  let previousRank = 0
  const ranked = data.map((item, index) => {
    const scoreKey = Math.round(item.score * 100)
    const displayRank = previousScore === scoreKey ? previousRank : index + 1
    previousScore = scoreKey
    previousRank = displayRank
    return { ...item, displayRank }
  })
  return (
    <>
      {ranked.map((i, index) => {
        const rank = i.displayRank ?? i.rank
        const gapToLeader = Math.max(0, leaderScore - i.score)
        const tied = (scoreCounts.get(Math.round(i.score * 100)) ?? 0) > 1
        const gapToPrevRank = index > 0 ? ranked[index - 1]!.score - i.score : 0
        // Scores cluster tightly in this system, so a flat point threshold flagged nearly every row as
        // "close". Only call out a race when it's both small in absolute terms and small relative to the
        // trailing person's own score, and only within the top ranks that are actually worth watching.
        const isHotRace =
          !tied && rank > 1 && rank <= 10 && gapToPrevRank > 0 && gapToPrevRank <= Math.max(0.2, i.score * 0.05)
        const gapLabel = isHotRace
          ? `🔥 앞순위와 ${gapToPrevRank.toFixed(1)}점 차이`
          : gapToLeader === 0
            ? "선두 그룹"
            : scoreGapLabel(gapToLeader)
        const streakLabel = i.activityStats
          ? `${i.activityStats.currentDayStreak}일 연속 · 집중 ${i.activityStats.currentHourStreak}h`
          : null
        return (
          <RowShell key={i.username} href={`/participant/${i.username}`} index={index}>
            <RankMedal
              rank={rank}
              className={
                isHotRace ? "animate-pulse ring-2 ring-orange-400/70 shadow-[0_0_10px_rgba(251,146,60,0.5)]" : undefined
              }
            />
            <InitialsAvatar name={i.name} githubUsername={i.username} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                {tied ? (
                  <span className="shrink-0 rounded border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                    <span className="sm:hidden">공동</span>
                    <span className="hidden sm:inline">공동 {rank}위</span>
                  </span>
                ) : null}
                {isHotRace ? (
                  <motion.span
                    animate={{ opacity: [1, 0.55, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    className="hidden shrink-0 items-center rounded border border-orange-400/40 bg-orange-400/10 p-1 text-orange-400 sm:flex"
                  >
                    <Flame className="h-3 w-3" />
                  </motion.span>
                ) : null}
                <span className="min-w-0 shrink truncate text-sm font-semibold">{i.name}</span>
                <span className="hidden min-w-0 shrink truncate font-mono text-xs text-muted-foreground sm:inline">
                  @{i.username}
                </span>
                <RankTierBadge rank={rank} rankDelta={i.prevRank - i.rank} />
              </div>
              <p className="mt-0.5 min-w-0 truncate text-[11px] text-muted-foreground">
                {[i.class, i.team ?? (i.class ? null : "GitHub 활동")].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-0.5 min-w-0 truncate text-[11px] text-muted-foreground">
                {[gapLabel, streakLabel].filter(Boolean).join(" · ")}
              </p>
              <MomentumBar value={i.score} max={maxScore} tone={rank === 1 ? "gold" : "primary"} />
            </div>
            <div className="w-[68px] shrink-0 text-right sm:w-24">
              <p className="text-lg font-bold tabular">{i.score.toFixed(1)}</p>
              <p className="whitespace-nowrap text-[10px] text-muted-foreground">{i.commits} commits</p>
              <p className="whitespace-nowrap text-[10px] text-muted-foreground">활동 {i.activeDays}일</p>
            </div>
            <RankChange rank={i.rank} prevRank={i.prevRank} isNew={i.isNew} className="w-8 shrink-0 justify-end" />
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary sm:block" />
          </RowShell>
        )
      })}
    </>
  )
}

function TeamRows({ data, metric }: { data: TeamRow[]; metric: TeamMetric }) {
  const ranked = metricRank(data, (item) =>
    metric === "score"
      ? item.score
      : metric === "commits"
        ? item.commits
        : (item.averagePerPerson ?? item.commits / Math.max(1, item.members.length)),
  )
  const maxValue = Math.max(1, ...ranked.map((entry) => entry.value))
  return (
    <>
      {ranked.map(({ item: t, value, rank, tied }, index) => {
        const avgValue = t.averagePerPerson ?? t.commits / Math.max(1, t.members.length)
        const avg = avgValue.toFixed(1)
        const mainValue =
          metric === "score" ? t.score.toFixed(1) : metric === "commits" ? t.commits.toLocaleString() : avg
        const mainLabel = metric === "score" ? "점수" : metric === "commits" ? "commits" : "commits/person"
        const memberText = t.members.length ? t.members.slice(0, 3).join(", ") : "참가자 활동 없음"
        const status =
          rank === 1
            ? tied
              ? "공동 선두"
              : "선두"
            : metric === "score"
              ? `1위와 ${(maxValue - value).toFixed(1)}점 차이`
              : metric === "commits"
                ? `1위와 ${Math.round(maxValue - value)}커밋 차이`
                : `1위와 ${(maxValue - value).toFixed(1)} 차이`
        return (
          <RowShell key={t.repo} href={`/team/${fmtRepoShort(t.repo)}`} index={index}>
            <RankMedal rank={rank} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                {tied ? (
                  <span className="shrink-0 rounded border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                    <span className="sm:hidden">공동</span>
                    <span className="hidden sm:inline">공동 {rank}위</span>
                  </span>
                ) : null}
                <span className="min-w-0 truncate font-mono text-sm font-semibold">{fmtRepoShort(t.repo)}</span>
                <RankTierBadge rank={rank} totalCount={ranked.length} />
                <span className="shrink-0 rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {t.class}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                <span className="truncate">{memberText}</span>
                {t.externalCount > 0 ? <span className="text-accent">기타 활동 {t.externalCount}명</span> : null}
                {t.botCount > 0 ? <span className="text-primary">자동화 커밋 {t.botCount}</span> : null}
                {t.unknownCount > 0 ? <span className="text-destructive">확인 필요 {t.unknownCount}</span> : null}
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                총 {t.commits.toLocaleString()} commits · 인당 평균 {avg} · 활동일 {t.activeDays}일
              </p>
              <LeaderGapLabel status={status} />
              <MomentumBar value={value} max={maxValue} tone={rank === 1 ? "gold" : "primary"} />
            </div>
            <div className="w-16 shrink-0 text-right sm:w-24">
              <p className="text-lg font-bold tabular">{mainValue}</p>
              <p className="text-[10px] text-muted-foreground">{mainLabel}</p>
            </div>
            <RankChange rank={t.rank} prevRank={t.prevRank} isNew={t.isNew} className="w-8 shrink-0 justify-end" />
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary sm:block" />
          </RowShell>
        )
      })}
    </>
  )
}

function ClassRows({ data, metric }: { data: ClassRow[]; metric: ClassMetric }) {
  const ranked = metricRank(data, (item) =>
    metric === "score"
      ? item.score
      : metric === "averagePerPerson"
        ? (item.averagePerPerson ?? item.totalCommits / Math.max(1, item.participants))
        : item.totalCommits,
  )
  const maxValue = Math.max(1, ...ranked.map((entry) => entry.value))
  return (
    <>
      {ranked.map(({ item: c, value, rank, tied }, index) => {
        const avgValue = c.averagePerPerson ?? c.totalCommits / Math.max(1, c.participants)
        const avg = avgValue.toFixed(1)
        const mainValue =
          metric === "score"
            ? c.score.toFixed(1)
            : metric === "averagePerPerson"
              ? avg
              : c.totalCommits.toLocaleString()
        const mainLabel =
          metric === "score" ? "평균 점수" : metric === "averagePerPerson" ? "commits/person" : "총 커밋"
        const activityRate = Math.round((c.activeParticipants / Math.max(1, c.participants)) * 100)
        const status =
          rank === 1
            ? tied
              ? "공동 선두"
              : "선두"
            : metric === "score"
              ? `1위와 ${(maxValue - value).toFixed(1)}점 차이`
              : metric === "averagePerPerson"
                ? `1위와 ${(maxValue - value).toFixed(1)} 차이`
                : `1위와 ${Math.round(maxValue - value)}커밋 차이`
        return (
          <RowShell key={c.className} index={index}>
            <RankMedal rank={rank} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {tied ? (
                  <span className="shrink-0 rounded border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                    <span className="sm:hidden">공동</span>
                    <span className="hidden sm:inline">공동 {rank}위</span>
                  </span>
                ) : null}
                <span className="text-sm font-semibold">{c.className}</span>
                <RankTierBadge rank={rank} totalCount={ranked.length} />
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                참가자 {c.participants}명 · 활동률 {activityRate}% ({c.activeParticipants}/{c.participants}) · 활성 repo{" "}
                {c.activeRepos}개
              </p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                총 {c.totalCommits.toLocaleString()} commits · 인당 평균 {avg}
              </p>
              <LeaderGapLabel status={status} />
              <MomentumBar value={value} max={maxValue} tone={rank === 1 ? "gold" : "primary"} />
            </div>
            <div className="w-16 shrink-0 text-right sm:w-28">
              <p className="text-lg font-bold tabular">{mainValue}</p>
              <p className="text-[10px] text-muted-foreground">{mainLabel}</p>
            </div>
            <RankChange rank={c.rank} prevRank={c.prevRank} isNew={c.isNew} className="w-8 shrink-0 justify-end" />
          </RowShell>
        )
      })}
    </>
  )
}

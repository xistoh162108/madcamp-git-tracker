"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, ChevronRight, Crown, Medal } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RankMedal } from "@/components/rank-medal"
import { RankChange } from "@/components/rank-change"
import { InitialsAvatar } from "@/components/initials-avatar"
import { Notice } from "@/components/notice"
import { WeekSelector } from "@/components/week-selector"
import { individuals, teams, classes, config, classNoticeText, repoNoticeText, fmtRepoShort } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"
import type { WeekConfig } from "@/src/config/schema"

type RankType = "individual" | "team" | "class"
type ClassMetric = "averagePerPerson" | "total"
type TeamMetric = "commits" | "averagePerPerson"

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
  if (!snapshot) return individuals.map((i) => ({ ...i, name: i.name, username: i.username, isNew: false }))
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
    }))
  const knownParticipants = new Set(
    snapshot.rankings.personal.flatMap((entry) => [entry.id, entry.meta, entry.label].filter(Boolean) as string[]),
  )
  return snapshot.rankings.teams.map((entry) => {
    const repoItems = snapshot.activityFeed.filter((item) => item.repoName === entry.label)
    const participantMembers = [
      ...new Set(repoItems.map((item) => item.label).filter((label) => label && knownParticipants.has(label))),
    ]
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
  const [teamMetric, setTeamMetric] = useState<TeamMetric>("averagePerPerson")
  const [classMetric, setClassMetric] = useState<ClassMetric>(config.defaultClassRankingMetric)
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

  const sortedTeams = useMemo(() => {
    const arr = [...filteredTeams]
    if (teamMetric === "averagePerPerson") {
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
    if (classMetric === "averagePerPerson") {
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
      className="rounded-2xl border border-border/70 bg-card/40 p-3 sm:p-4"
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

      {type === "team" ? (
        <RankingRule>
          {teamMetric === "commits"
            ? "총 커밋 기준 정렬 · 동점은 공동 순위로 표시하고 보조 기준은 인당 평균, 최근 활동순입니다."
            : "인당 평균 기준 정렬 · 동점은 공동 순위로 표시하고 보조 기준은 총 커밋, 최근 활동순입니다."}
        </RankingRule>
      ) : null}
      {type === "class" ? (
        <RankingRule>
          {classMetric === "averagePerPerson"
            ? "등록 참가자 수 기준 인당 평균으로 정렬합니다. 동점은 공동 순위로 표시하고 보조 기준은 총 커밋입니다."
            : "총 커밋 기준 정렬 · 동점은 공동 순위로 표시하고 보조 기준은 인당 평균입니다."}
        </RankingRule>
      ) : null}

      {/* Rows */}
      <AnimatePresence mode="wait">
        <motion.div
          key={type}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="mt-4 max-h-[620px] space-y-1.5 overflow-y-auto pr-1"
        >
          {type === "individual" && <IndividualRows data={filteredIndividuals.slice(0, 50)} />}
          {type === "team" && <TeamRows data={sortedTeams.slice(0, 50)} metric={teamMetric} />}
          {type === "class" && <ClassRows data={sortedClasses.slice(0, 50)} metric={classMetric} />}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 border-t border-border/60 pt-3">
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
    "group relative flex items-center gap-3 overflow-hidden rounded-lg border border-border/50 bg-card/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-card"
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

function RankTierBadge({ rank, rising = false, totalCount }: { rank: number; rising?: boolean; totalCount?: number }) {
  if (totalCount !== undefined && totalCount < 5 && rank > 1) return null
  const tier =
    rank === 1
      ? { label: "선두 그룹", icon: Crown, cls: "border-gold/25 bg-gold/10 text-gold" }
      : rank <= 3
        ? { label: "상위권", icon: Medal, cls: "border-primary/25 bg-primary/10 text-primary" }
        : rising
          ? { label: "상승 중", icon: ArrowUpRight, cls: "border-positive/25 bg-positive/10 text-positive" }
          : { label: "추격 중", icon: ArrowUpRight, cls: "border-border bg-muted/40 text-muted-foreground" }
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

function commitGapLabel(count: number) {
  return `선두까지 ${count}커밋`
}

function MomentumBar({ value, max, tone = "primary" }: { value: number; max: number; tone?: "primary" | "gold" }) {
  const width = `${Math.max(6, Math.round((value / Math.max(1, max)) * 100))}%`
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/50">
      <motion.div
        className={cn(
          "progress-glint relative h-full overflow-hidden rounded-full",
          tone === "gold" ? "bg-gold" : "bg-primary",
        )}
        initial={{ width: 0 }}
        animate={{ width }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

function LeaderRatioLabel({ ratio, status, className }: { ratio: number; status: string; className?: string }) {
  return (
    <div className={cn("mt-1 flex items-center justify-between text-[10px] text-muted-foreground", className)}>
      <span>선두 대비 {ratio}%</span>
      <span>{status}</span>
    </div>
  )
}

function IndividualRows({ data }: { data: PersonalRow[] }) {
  const maxCommits = Math.max(1, ...data.map((item) => item.commits))
  const leaderCommits = maxCommits
  const commitCounts = data.reduce<Map<number, number>>((map, item) => {
    map.set(item.commits, (map.get(item.commits) ?? 0) + 1)
    return map
  }, new Map())
  let previousCommits: number | null = null
  let previousRank = 0
  const ranked = data.map((item, index) => {
    const displayRank = previousCommits === item.commits ? previousRank : index + 1
    previousCommits = item.commits
    previousRank = displayRank
    return { ...item, displayRank }
  })
  return (
    <>
      {ranked.map((i, index) => {
        const rank = i.displayRank ?? i.rank
        const gapToLeader = Math.max(0, leaderCommits - i.commits)
        const leaderRatio = Math.round((i.commits / Math.max(1, leaderCommits)) * 100)
        const tied = (commitCounts.get(i.commits) ?? 0) > 1
        return (
          <RowShell key={i.username} href={`/participant/${i.username}`} index={index}>
            <RankMedal rank={rank} />
            <InitialsAvatar name={i.name} githubUsername={i.username} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {tied ? (
                  <span className="shrink-0 rounded border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                    공동 {rank}위
                  </span>
                ) : null}
                <span className="truncate text-sm font-semibold">{i.name}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">@{i.username}</span>
                <RankTierBadge rank={rank} rising={i.prevRank > i.rank} />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {i.class ? <span>{i.class}</span> : null}
                {i.class && i.team ? <span className="text-border">·</span> : null}
                {i.team ? <span className="font-mono">{i.team}</span> : <span>GitHub 활동</span>}
                <span className="text-border">·</span>
                {gapToLeader === 0 ? (
                  <span className="text-gold">선두 그룹</span>
                ) : (
                  <span>{commitGapLabel(gapToLeader)}</span>
                )}
                {i.activityStats ? (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-positive">{i.activityStats.currentDayStreak}일 streak</span>
                    <span className="text-border">·</span>
                    <span className="text-primary">{i.activityStats.currentHourStreak}h focus</span>
                  </>
                ) : null}
              </div>
              <LeaderRatioLabel
                ratio={leaderRatio}
                status={gapToLeader === 0 ? "1위와 동률" : commitGapLabel(gapToLeader)}
              />
              <MomentumBar value={i.commits} max={maxCommits} tone={rank === 1 ? "gold" : "primary"} />
            </div>
            <div className="hidden w-24 text-right sm:block">
              <p className="text-xs font-medium text-foreground">활동 {i.activeDays}일</p>
              <p className="text-[11px] text-muted-foreground">{i.lastActivity}</p>
            </div>
            <div className="w-16 text-right">
              <p className="text-base font-bold tabular">{i.commits}</p>
              <p className="text-[10px] text-muted-foreground">commits</p>
            </div>
            <RankChange rank={i.rank} prevRank={i.prevRank} isNew={i.isNew} className="w-8 justify-end" />
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
          </RowShell>
        )
      })}
    </>
  )
}

function TeamRows({ data, metric }: { data: TeamRow[]; metric: TeamMetric }) {
  const ranked = metricRank(data, (item) =>
    metric === "commits" ? item.commits : (item.averagePerPerson ?? item.commits / Math.max(1, item.members.length)),
  )
  const maxValue = Math.max(1, ...ranked.map((entry) => entry.value))
  const leaderCommits = Math.max(0, ...data.map((item) => item.commits))
  return (
    <>
      {ranked.map(({ item: t, value, rank, tied }, index) => {
        const avgValue = t.averagePerPerson ?? t.commits / Math.max(1, t.members.length)
        const avg = avgValue.toFixed(1)
        const mainValue = metric === "commits" ? t.commits.toLocaleString() : avg
        const mainLabel = metric === "commits" ? "commits" : "commits/person"
        const gapToLeader = Math.max(0, leaderCommits - t.commits)
        const ratio = Math.round((value / Math.max(1, maxValue)) * 100)
        const memberText = t.members.length ? t.members.slice(0, 3).join(", ") : "참가자 활동 없음"
        const status =
          ratio === 100
            ? tied
              ? "공동 선두"
              : "선두"
            : metric === "commits"
              ? commitGapLabel(gapToLeader)
              : `선두 기준까지 ${(maxValue - value).toFixed(1)}`
        return (
          <RowShell key={t.repo} href={`/team/${fmtRepoShort(t.repo)}`} index={index}>
            <RankMedal rank={rank} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {tied ? (
                  <span className="shrink-0 rounded border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                    공동 {rank}위
                  </span>
                ) : null}
                <span className="truncate font-mono text-sm font-semibold">{fmtRepoShort(t.repo)}</span>
                <RankTierBadge rank={rank} totalCount={ranked.length} />
                <span className="shrink-0 rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {t.class}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                <span className="truncate">{memberText}</span>
                {t.externalCount > 0 ? <span className="text-accent">기타 활동 {t.externalCount}명</span> : null}
                {t.botCount > 0 ? <span className="text-primary">자동화 {t.botCount}</span> : null}
                {t.unknownCount > 0 ? <span className="text-destructive">확인 필요 {t.unknownCount}</span> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                {metric === "commits" ? (
                  <span>인당 평균 {avg}</span>
                ) : (
                  <span>총 {t.commits.toLocaleString()} commits</span>
                )}
                <span className="text-border">·</span>
                <span>활동일 {t.activeDays}일</span>
                <span className="text-border">·</span>
                <span>최근 {t.lastActivity}</span>
                <span className="text-border">·</span>
                <span>{status}</span>
              </div>
              <LeaderRatioLabel ratio={ratio} status={status} />
              <MomentumBar value={value} max={maxValue} tone={rank === 1 ? "gold" : "primary"} />
            </div>
            <div className="w-24 text-right">
              <p className="text-lg font-bold tabular">{mainValue}</p>
              <p className="text-[10px] text-muted-foreground">{mainLabel}</p>
            </div>
            <RankChange rank={t.rank} prevRank={t.prevRank} isNew={t.isNew} className="w-8 justify-end" />
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
          </RowShell>
        )
      })}
    </>
  )
}

function ClassRows({ data, metric }: { data: ClassRow[]; metric: ClassMetric }) {
  const ranked = metricRank(data, (item) =>
    metric === "averagePerPerson"
      ? (item.averagePerPerson ?? item.totalCommits / Math.max(1, item.participants))
      : item.totalCommits,
  )
  const maxValue = Math.max(1, ...ranked.map((entry) => entry.value))
  return (
    <>
      {ranked.map(({ item: c, value, rank, tied }, index) => {
        const avgValue = c.averagePerPerson ?? c.totalCommits / Math.max(1, c.participants)
        const avg = avgValue.toFixed(1)
        const mainValue = metric === "averagePerPerson" ? avg : c.totalCommits.toLocaleString()
        const mainLabel = metric === "averagePerPerson" ? "commits/person" : "총 커밋"
        const ratio = Math.round((value / Math.max(1, maxValue)) * 100)
        const status =
          ratio === 100
            ? tied
              ? "공동 선두"
              : "선두"
            : metric === "averagePerPerson"
              ? `선두 기준까지 ${(maxValue - value).toFixed(1)}`
              : commitGapLabel(Math.max(0, maxValue - value))
        return (
          <RowShell key={c.className} index={index}>
            <RankMedal rank={rank} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {tied ? (
                  <span className="shrink-0 rounded border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                    공동 {rank}위
                  </span>
                ) : null}
                <span className="text-sm font-semibold">{c.className}</span>
                <RankTierBadge rank={rank} totalCount={ranked.length} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                참가자 {c.participants}명 · 활동 참가자 {c.activeParticipants}명 · 활성 repo {c.activeRepos}개
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {metric === "averagePerPerson"
                  ? `총 ${c.totalCommits.toLocaleString()} commits · 등록 참가자 기준 평균`
                  : `인당 평균 ${avg} · 등록 참가자 기준`}
              </p>
              <LeaderRatioLabel ratio={ratio} status={status} />
              <MomentumBar value={value} max={maxValue} tone={rank === 1 ? "gold" : "primary"} />
            </div>
            <div className="w-28 text-right">
              <p className="text-lg font-bold tabular">{mainValue}</p>
              <p className="text-[10px] text-muted-foreground">{mainLabel}</p>
            </div>
            <RankChange rank={c.rank} prevRank={c.prevRank} isNew={c.isNew} className="w-8 justify-end" />
          </RowShell>
        )
      })}
    </>
  )
}

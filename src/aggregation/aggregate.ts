import type { Participant } from "../participants/participant-schema"
import { commitScore, isQualifiedCommit } from "../scoring/commit-score"
import { dailyScore, teamScore, weeklyScore, type DailyScoreResult } from "../scoring/period-score"
import type { CommitKind, CommitRecord, RankedEntry, UnknownUser } from "./types"

export interface AggregatedSnapshot {
  generatedAt: string
  generatedAtKst: string
  season: string
  currentWeek: number | null
  summary: {
    totalCommits: number
    mappedCommits: number
    activeRepos: number
    participants: number
    activeParticipants: number
  }
  rankings: {
    personal: RankedEntry[]
    teams: RankedEntry[]
    classes: RankedEntry[]
  }
  activityFeed: Array<{
    id: string
    repoName: string
    label: string
    committedAt: string
    summary: string
    attributionStatus?: CommitRecord["attributionStatus"]
    detectedBots?: string[]
    commitUrl?: string
    branches?: string[]
    additions?: number
    deletions?: number
    changedFiles?: number
    commitKind?: CommitKind
    score?: number
  }>
  heatmap: Array<{ date: string; count: number }>
  hourlyDistribution?: Array<{ hour: string; commits: number }>
  unknownUsers: UnknownUser[]
  sync?: {
    status: "ok" | "partial" | "failed"
    failedRepos: Array<{ repoName: string; reason: string }>
    rateLimit: { limit?: number; remaining?: number; reset?: number; used?: number }
    // Repos scanned *in this snapshot's own scope* -- for the per-week snapshot this is that
    // week's repo count; for the all-time snapshot it's still just the current sync run's (i.e.
    // current week's) repo count, kept for backward compatibility with anything already reading it.
    reposScanned: number
    // Total repos tracked across every enabled week of the whole camp, regardless of scope --
    // the correct denominator for an all-time "N/total repos" stat (reposScanned alone isn't,
    // since it's always just the current week's count even on the all-time snapshot).
    reposTracked: number
    commitsProcessed: number
  }
}

function rank(
  entries: Omit<RankedEntry, "rank" | "prevRank" | "isNew">[],
  metric: (entry: Omit<RankedEntry, "rank" | "prevRank" | "isNew">) => number,
  previousRankOf?: (id: string) => number | undefined,
): RankedEntry[] {
  return [...entries]
    .sort((a, b) => metric(b) - metric(a) || a.label.localeCompare(b.label))
    .map((entry, index) => {
      const currentRank = index + 1
      const prevRank = previousRankOf?.(entry.id)
      return {
        ...entry,
        rank: currentRank,
        prevRank: prevRank ?? currentRank,
        isNew: previousRankOf !== undefined && prevRank === undefined,
      }
    })
}

function formatKstCompact(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"
  return `${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`
}

function previousRankLookup(
  previousSnapshot: AggregatedSnapshot | undefined,
  kind: keyof AggregatedSnapshot["rankings"],
  requireScore = false,
): ((id: string) => number | undefined) | undefined {
  if (!previousSnapshot) return undefined
  if (requireScore && previousSnapshot.rankings[kind].some((entry) => typeof entry.score !== "number")) {
    return undefined
  }
  const map = new Map(previousSnapshot.rankings[kind].map((entry) => [entry.id, entry.rank]))
  return (id: string) => map.get(id)
}

function dayOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso))
}

function hourBucketOf(iso: string): string {
  const date = new Date(iso)
  const day = dayOf(iso)
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(date)
  return `${day}T${hour}`
}

export function dedupeCommits(commits: CommitRecord[]): CommitRecord[] {
  const seen = new Map<string, CommitRecord>()
  for (const commit of commits) {
    const key = `${commit.repoName}:${commit.sha}`
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, { ...commit, sourceBranches: [...new Set(commit.sourceBranches ?? [])] })
      continue
    }
    existing.sourceBranches = [...new Set([...existing.sourceBranches!, ...(commit.sourceBranches ?? [])])]
  }
  return [...seen.values()]
}

function bucketTime(bucket: string, unit: "day" | "hour"): number {
  return Date.parse(unit === "day" ? `${bucket}T00:00:00+09:00` : `${bucket}:00:00+09:00`)
}

function consecutiveCount(sortedBuckets: string[], unit: "day" | "hour"): number {
  if (sortedBuckets.length === 0) return 0
  let count = 1
  for (let index = sortedBuckets.length - 1; index > 0; index -= 1) {
    const current = bucketTime(sortedBuckets[index]!, unit)
    const previous = bucketTime(sortedBuckets[index - 1]!, unit)
    const expectedGap = unit === "day" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000
    if (current - previous !== expectedGap) break
    count += 1
  }
  return count
}

function longestConsecutiveCount(sortedBuckets: string[], unit: "day" | "hour"): number {
  if (sortedBuckets.length === 0) return 0
  let current = 1
  let longest = 1
  const expectedGap = unit === "day" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000
  for (let index = 1; index < sortedBuckets.length; index += 1) {
    const previousTime = bucketTime(sortedBuckets[index - 1]!, unit)
    const currentTime = bucketTime(sortedBuckets[index]!, unit)
    if (currentTime - previousTime === expectedGap) {
      current += 1
    } else {
      current = 1
    }
    longest = Math.max(longest, current)
  }
  return longest
}

export function activityStatsForCommits(commits: CommitRecord[], now = new Date()) {
  const dayBuckets = [...new Set(commits.map((commit) => dayOf(commit.committedAt)))].sort()
  const hourBuckets = [...new Set(commits.map((commit) => hourBucketOf(commit.committedAt)))].sort()
  const nowIso = now.toISOString()
  // A streak is only "current" if the last bucket is today/this hour; otherwise it has already broken.
  const dayStreakIsLive = dayBuckets.at(-1) === dayOf(nowIso)
  const hourStreakIsLive = hourBuckets.at(-1) === hourBucketOf(nowIso)
  return {
    currentDayStreak: dayStreakIsLive ? consecutiveCount(dayBuckets, "day") : 0,
    longestDayStreak: longestConsecutiveCount(dayBuckets, "day"),
    currentHourStreak: hourStreakIsLive ? consecutiveCount(hourBuckets, "hour") : 0,
    longestHourStreak: longestConsecutiveCount(hourBuckets, "hour"),
    activeHours: hourBuckets.length,
  }
}

function hourOfDayKst(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(new Date(iso))
}

/**
 * Average commits per active day, per hour-of-day -- computed from the *full* commit list for
 * whatever scope is passed in (all commits for the home page, one participant's commits for their
 * profile page), never from `activityFeed`. `activityFeed` is capped at 200 most-recent items for
 * display purposes, so deriving hourly stats from it silently drops older hours as commit volume
 * grows past that cap (e.g. an early-morning commit from days ago quietly vanishes from the
 * average once 200 newer commits have landed since).
 */
function hourlyDistribution(items: CommitRecord[]): Array<{ hour: string; commits: number }> {
  const counts = new Map(Array.from({ length: 24 }, (_, hour) => [String(hour).padStart(2, "0"), 0]))
  const activeDays = new Set<string>()
  for (const item of items) {
    const hour = hourOfDayKst(item.committedAt)
    counts.set(hour, (counts.get(hour) ?? 0) + 1)
    activeDays.add(dayOf(item.committedAt))
  }
  const dayCount = Math.max(1, activeDays.size)
  return [...counts.entries()].map(([hour, commits]) => ({
    hour,
    commits: Math.round((commits / dayCount) * 10) / 10,
  }))
}

/**
 * Per-day commit counts for whatever scope is passed in -- computed from the *full* commit list,
 * never from `activityFeed`. Same rationale as `hourlyDistribution`: `activityFeed` is capped at
 * 200 most-recent items across the whole camp, so a participant's older days silently fall out of
 * their daily trend chart / commit calendar once camp-wide volume passes that cap, even though
 * that participant's own commits haven't gone anywhere.
 */
function dailyHeatmap(items: CommitRecord[]): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(dayOf(item.committedAt), (counts.get(dayOf(item.committedAt)) ?? 0) + 1)
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))
}

/**
 * Per-week commit counts (and which repo/team that week was in) for whatever scope is passed in --
 * same full-data rationale as `dailyHeatmap`. The participant page's week-by-week history and
 * "current team" lookup used to derive this from the capped `activityFeed`, which could silently
 * under-count or entirely miss older weeks, or misidentify a barely-active participant's current
 * team, once camp-wide commit volume passed the 200-item cap.
 */
function weeklyBreakdown(items: CommitRecord[]): Array<{ week: number; repoName: string; commits: number }> {
  const byWeek = new Map<number, CommitRecord[]>()
  for (const item of items) byWeek.set(item.week, [...(byWeek.get(item.week) ?? []), item])
  return [...byWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, weekItems]) => ({ week, repoName: weekItems[0]!.repoName, commits: weekItems.length }))
}

/** Commit-kind counts for the full commit list, same full-data rationale as `dailyHeatmap` above. */
function commitKindBreakdown(items: CommitRecord[]): Array<{ kind: string; count: number }> {
  const counts = new Map<string, number>()
  for (const item of items) {
    const kind = item.commitKind ?? "normal"
    counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  return [...counts.entries()].sort(([, a], [, b]) => b - a).map(([kind, count]) => ({ kind, count }))
}

/** Groups a participant's (or team's) commits by KST day and runs `dailyScore` once per day, so
 *  the per-commit effective multiplier and the weekly total are always derived from the same pass
 *  -- callers must not re-group/re-score independently or the two can silently drift apart. Also
 *  returns each individual commit's day-uniform effective multiplier (keyed by `repoName:sha`) so
 *  a per-commit display can show exactly what that commit contributed after compression/penalty. */
function dailyResultsByDay(items: CommitRecord[]): {
  byDay: Map<string, DailyScoreResult>
  effectiveMultiplierByCommitKey: Map<string, number>
} {
  const byDayItems = new Map<string, CommitRecord[]>()
  for (const commit of items) {
    const key = dayOf(commit.committedAt)
    byDayItems.set(key, [...(byDayItems.get(key) ?? []), commit])
  }
  const byDay = new Map<string, DailyScoreResult>()
  const effectiveMultiplierByCommitKey = new Map<string, number>()
  for (const [day, dayCommits] of byDayItems) {
    const chronological = [...dayCommits].sort((a, b) => Date.parse(a.committedAt) - Date.parse(b.committedAt))
    const result = dailyScore(chronological)
    byDay.set(day, result)
    for (const commit of chronological) {
      effectiveMultiplierByCommitKey.set(`${commit.repoName}:${commit.sha}`, result.effectiveMultiplier)
    }
  }
  return { byDay, effectiveMultiplierByCommitKey }
}

/**
 * A display-ready recent-commit list scoped to one participant's own full commit list -- NOT
 * sliced from the camp-wide `activityFeed`. The participant page used to filter the global feed
 * (top 200 most-recent commits across everyone) by author, which meant a participant whose own
 * most recent commit was older than the 200th most-recent commit camp-wide would show "no commits
 * yet" even though they have real history -- their commits simply aged out of a feed that was
 * never scoped to them in the first place.
 *
 * Deliberately uncapped: every commit is included so the page's per-commit score list always sums
 * to the same total shown as the participant's score (see below) -- truncating this list would
 * silently reintroduce the "numbers on the page don't add up" complaint this was built to fix.
 *
 * `score` here is the commit's *effective* contribution -- `commitScore(commit)` multiplied by that
 * commit's combined penalty/volume-decay multiplier -- not the raw per-commit score. Without this,
 * a participant manually summing the scores shown per commit would get a higher number than their
 * displayed total on a day a penalty or the volume-decay curve applied, which is exactly the "score
 * doesn't add up" complaint this was built to resolve. There is no day/week bonus layered on top of
 * this list anywhere else in the system, so summing every entry's `score` always equals the
 * participant's total `score` exactly -- not approximately, by construction.
 */
function recentCommitsFor(items: CommitRecord[], effectiveMultiplierByCommitKey: Map<string, number>) {
  return items
    .slice()
    .sort((a, b) => Date.parse(b.committedAt) - Date.parse(a.committedAt))
    .map((commit) => {
      const key = `${commit.repoName}:${commit.sha}`
      const multiplier = effectiveMultiplierByCommitKey.get(key) ?? 1
      return {
        id: key,
        repoName: commit.repoName,
        committedAt: commit.committedAt,
        summary: (commit.messageSummary ?? "commit").replace(/[<>]/g, "").slice(0, 100),
        commitUrl: commit.commitUrl,
        branches: commit.sourceBranches,
        additions: commit.additions,
        deletions: commit.deletions,
        changedFiles: commit.changedFiles,
        commitKind: commit.commitKind,
        score: commitScore(commit) * multiplier,
      }
    })
}

function scoreStatsForCommits(
  items: CommitRecord[],
  dailyResults: Map<string, DailyScoreResult> = dailyResultsByDay(items).byDay,
): {
  score: number
  qualifiedCommits: number
  avgChangedLines: number
  avgChangedFiles: number
  messageFormatRate: number
} {
  const results = [...dailyResults.values()]
  const weekly = weeklyScore(results)
  const qualifiedCommits = items.filter(isQualifiedCommit).length
  const conventionalCount = items.filter((item) => item.isConventionalMessage).length

  // "Typical commit size" should describe a person's real, hand-written work -- a merge/lockfile/
  // generated-files/asset-only commit isn't a unit of authored work, and including one (e.g. a
  // vendored dependency directory accidentally committed, hundreds of thousands of lines) would
  // massively distort the displayed average even though it barely affects score (already floored
  // low by the size/file bands). Pre-classification legacy commits (commitKind undefined) are kept
  // in, matching the neutral-fallback treatment used elsewhere for not-yet-backfilled data.
  const normalItems = items.filter((item) => item.commitKind === undefined || item.commitKind === "normal")
  const changedLinesSum = normalItems.reduce((sum, item) => sum + (item.additions ?? 0) + (item.deletions ?? 0), 0)
  const changedFilesSum = normalItems.reduce((sum, item) => sum + (item.changedFiles ?? 0), 0)
  return {
    score: weekly.score,
    qualifiedCommits,
    avgChangedLines: normalItems.length ? changedLinesSum / normalItems.length : 0,
    avgChangedFiles: normalItems.length ? changedFilesSum / normalItems.length : 0,
    messageFormatRate: items.length ? conventionalCount / items.length : 0,
  }
}

function teamMemberBreakdown(
  items: CommitRecord[],
  participantMap: Map<string, Participant>,
): Array<{ participantId: string; label: string; githubUsername?: string; qualifiedCommits: number; score: number }> {
  const byParticipant = new Map<string, CommitRecord[]>()
  for (const commit of items) {
    for (const participantId of participantIdsForCommit(commit)) {
      byParticipant.set(participantId, [...(byParticipant.get(participantId) ?? []), commit])
    }
  }
  return [...byParticipant.entries()].map(([participantId, commits]) => {
    const stats = scoreStatsForCommits(commits)
    const participant = participantMap.get(participantId)
    return {
      participantId,
      label: participant?.name ?? participantId,
      githubUsername: participant?.githubUsername,
      qualifiedCommits: stats.qualifiedCommits,
      score: stats.score,
    }
  })
}

export function aggregateSnapshot(params: {
  season: string
  currentWeek: number | null
  participants: Participant[]
  commits: CommitRecord[]
  unknownUsers?: UnknownUser[]
  previousSnapshot?: AggregatedSnapshot
  weekEnded?: boolean
}): AggregatedSnapshot {
  // bot_only commits (e.g. the madcamp-staff repo-scaffolding account) have no participant behind them
  // at all -- exclude them from every count (team/class commit totals, summary, activity feed), not just
  // from scoring where they were already excluded via participantIdsForCommit returning [].
  const commits = dedupeCommits(params.commits).filter((commit) => commit.attributionStatus !== "bot_only")
  const participantMap = new Map(params.participants.map((participant) => [participant.participantId, participant]))
  const grouped = {
    personal: new Map<string, CommitRecord[]>(),
    teams: new Map<string, CommitRecord[]>(),
    classes: new Map<number, CommitRecord[]>(),
  }

  for (const commit of commits) {
    for (const participantId of participantIdsForCommit(commit)) {
      grouped.personal.set(participantId, [...(grouped.personal.get(participantId) ?? []), commit])
    }
    grouped.teams.set(commit.repoName, [...(grouped.teams.get(commit.repoName) ?? []), commit])
    grouped.classes.set(commit.class, [...(grouped.classes.get(commit.class) ?? []), commit])
  }

  const personalEntries = [...grouped.personal.entries()].map(([participantId, items]) => {
    const participant = participantMap.get(participantId)
    const { byDay, effectiveMultiplierByCommitKey } = dailyResultsByDay(items)
    const scoreStats = scoreStatsForCommits(items, byDay)
    return {
      id: participantId,
      label: participant?.name ?? participantId,
      commits: items.length,
      activeDays: new Set(items.map((item) => dayOf(item.committedAt))).size,
      lastActivityAt: items
        .map((item) => item.committedAt)
        .sort()
        .at(-1),
      meta: participant?.githubUsername,
      activityStats: activityStatsForCommits(items),
      hourlyDistribution: hourlyDistribution(items),
      heatmap: dailyHeatmap(items),
      commitKindBreakdown: commitKindBreakdown(items),
      weeklyBreakdown: weeklyBreakdown(items),
      recentCommits: recentCommitsFor(items, effectiveMultiplierByCommitKey),
      ...scoreStats,
    }
  })

  const teams = rank(
    [...grouped.teams.entries()].map(([repoName, items]) => {
      const memberBreakdown = teamMemberBreakdown(items, participantMap)
      const teamSize = memberBreakdown.length
      const { score } = teamScore(
        memberBreakdown.map((member) => member.score),
        memberBreakdown.map((member) => member.qualifiedCommits),
        teamSize,
      )
      return {
        id: repoName,
        label: repoName,
        commits: items.length,
        activeDays: new Set(items.map((item) => dayOf(item.committedAt))).size,
        lastActivityAt: items
          .map((item) => item.committedAt)
          .sort()
          .at(-1),
        meta: `${items[0]!.class}분반 · ${items[0]!.teamNumber}팀`,
        averagePerPerson: items.length / Math.max(1, teamSize),
        score,
        memberBreakdown,
      }
    }),
    (entry) => entry.score ?? 0,
    previousRankLookup(params.previousSnapshot, "teams", true),
  )

  const topTeamParticipantIds = new Set(
    teams[0] ? grouped.teams.get(teams[0].id)!.flatMap((item) => participantIdsForCommit(item)) : [],
  )
  const maxPersonalScore = Math.max(0, ...personalEntries.map((item) => item.score))
  const personal = rank(
    personalEntries.map((entry) => {
      const titles: Array<{ id: string; label: string; desc: string }> = []
      if (
        params.currentWeek &&
        params.weekEnded &&
        entry.commits === Math.max(0, ...personalEntries.map((item) => item.commits))
      ) {
        titles.push({
          id: `w${params.currentWeek}-top-committer`,
          label: `${params.currentWeek}주차 최다 커밋자`,
          desc: `${params.currentWeek}주차 개인 커밋 수 1위`,
        })
      }
      if (params.currentWeek && params.weekEnded && entry.score === maxPersonalScore) {
        titles.push({
          id: `w${params.currentWeek}-top-score`,
          label: `${params.currentWeek}주차 최고 기여점수`,
          desc: `${params.currentWeek}주차 개발 리듬 점수 1위`,
        })
      }
      if (params.currentWeek && params.weekEnded && topTeamParticipantIds.has(entry.id)) {
        titles.push({
          id: `w${params.currentWeek}-top-team-member`,
          label: `${params.currentWeek}주차 우승팀`,
          desc: `${params.currentWeek}주차 팀 점수 1위 팀 멤버`,
        })
      }
      return { ...entry, honorTitles: titles }
    }),
    (entry) => entry.score ?? 0,
    previousRankLookup(params.previousSnapshot, "personal", true),
  )

  const personalScoreById = new Map(personalEntries.map((entry) => [entry.id, entry.score]))
  const classes = rank(
    [...grouped.classes.entries()].map(([classNumber, items]) => {
      const classParticipants = params.participants.filter((participant) => participant.class === classNumber)
      const participantCount = classParticipants.length
      const totalScore = classParticipants.reduce(
        (sum, participant) => sum + (personalScoreById.get(participant.participantId) ?? 0),
        0,
      )
      return {
        id: String(classNumber),
        label: `${classNumber}분반`,
        commits: items.length,
        activeDays: new Set(items.map((item) => dayOf(item.committedAt))).size,
        lastActivityAt: items
          .map((item) => item.committedAt)
          .sort()
          .at(-1),
        meta: `${participantCount}명`,
        averagePerPerson: items.length / Math.max(1, participantCount),
        score: totalScore / Math.max(1, participantCount),
      }
    }),
    (entry) => entry.score ?? 0,
    previousRankLookup(params.previousSnapshot, "classes", true),
  )

  const heatmapCounts = new Map<string, number>()
  for (const commit of commits)
    heatmapCounts.set(dayOf(commit.committedAt), (heatmapCounts.get(dayOf(commit.committedAt)) ?? 0) + 1)

  return {
    generatedAt: new Date().toISOString(),
    generatedAtKst: formatKstCompact(new Date()),
    season: params.season,
    currentWeek: params.currentWeek,
    summary: {
      totalCommits: commits.length,
      mappedCommits: commits.filter((commit) => participantIdsForCommit(commit).length > 0).length,
      activeRepos: new Set(commits.map((commit) => commit.repoName)).size,
      participants: params.participants.length,
      activeParticipants: grouped.personal.size,
    },
    rankings: { personal, teams, classes },
    activityFeed: commits
      .slice()
      .sort((a, b) => Date.parse(b.committedAt) - Date.parse(a.committedAt))
      .slice(0, 200)
      .map((commit) => {
        const matchedParticipant = participantMap.get(participantIdsForCommit(commit)[0] ?? "")
        const actorLabel =
          matchedParticipant?.githubUsername ??
          (commit.attributionStatus === "bot_only"
            ? (commit.detectedBots?.[0] ?? commit.authorName ?? "자동화")
            : (commit.authorGithubUsername ?? commit.authorName ?? "unknown"))
        return {
          id: `${commit.repoName}:${commit.sha}`,
          repoName: commit.repoName,
          label: actorLabel,
          committedAt: commit.committedAt,
          summary: (commit.messageSummary ?? "commit").replace(/[<>]/g, "").slice(0, 100),
          attributionStatus: commit.attributionStatus,
          detectedBots: commit.detectedBots,
          commitUrl: commit.commitUrl,
          branches: commit.sourceBranches,
          additions: commit.additions,
          deletions: commit.deletions,
          changedFiles: commit.changedFiles,
          commitKind: commit.commitKind,
          score: commitScore(commit),
        }
      }),
    heatmap: [...heatmapCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
    hourlyDistribution: hourlyDistribution(commits),
    unknownUsers: params.unknownUsers ?? [],
  }
}

function participantIdsForCommit(commit: CommitRecord): string[] {
  const ids =
    commit.matchedParticipants?.map((match) => match.participantId) ??
    (commit.participantId ? [commit.participantId] : [])
  return [...new Set(ids)]
}

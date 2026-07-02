import type { Participant } from "../participants/participant-schema"
import type { CommitRecord, RankedEntry, UnknownUser } from "./types"

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
  }>
  heatmap: Array<{ date: string; count: number }>
  unknownUsers: UnknownUser[]
  sync?: {
    status: "ok" | "partial" | "failed"
    failedRepos: Array<{ repoName: string; reason: string }>
    rateLimit: { limit?: number; remaining?: number; reset?: number; used?: number }
    reposScanned: number
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
): ((id: string) => number | undefined) | undefined {
  if (!previousSnapshot) return undefined
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

export function aggregateSnapshot(params: {
  season: string
  currentWeek: number | null
  participants: Participant[]
  commits: CommitRecord[]
  unknownUsers?: UnknownUser[]
  previousSnapshot?: AggregatedSnapshot
  weekEnded?: boolean
}): AggregatedSnapshot {
  const commits = dedupeCommits(params.commits)
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
    }
  })

  const teams = rank(
    [...grouped.teams.entries()].map(([repoName, items]) => ({
      id: repoName,
      label: repoName,
      commits: items.length,
      activeDays: new Set(items.map((item) => dayOf(item.committedAt))).size,
      lastActivityAt: items
        .map((item) => item.committedAt)
        .sort()
        .at(-1),
      meta: `${items[0]!.class}분반 · ${items[0]!.teamNumber}팀`,
      averagePerPerson:
        items.length / Math.max(1, new Set(items.flatMap((item) => participantIdsForCommit(item))).size),
    })),
    (entry) => entry.commits,
    previousRankLookup(params.previousSnapshot, "teams"),
  )

  const topTeamParticipantIds = new Set(
    teams[0] ? grouped.teams.get(teams[0].id)!.flatMap((item) => participantIdsForCommit(item)) : [],
  )
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
      if (params.currentWeek && params.weekEnded && topTeamParticipantIds.has(entry.id)) {
        titles.push({
          id: `w${params.currentWeek}-top-team-member`,
          label: `${params.currentWeek}주차 우승팀`,
          desc: `${params.currentWeek}주차 팀 커밋 수 1위 팀 멤버`,
        })
      }
      return { ...entry, honorTitles: titles }
    }),
    (entry) => entry.commits,
    previousRankLookup(params.previousSnapshot, "personal"),
  )

  const classes = rank(
    [...grouped.classes.entries()].map(([classNumber, items]) => {
      const participantCount = params.participants.filter((participant) => participant.class === classNumber).length
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
      }
    }),
    (entry) => entry.averagePerPerson!,
    previousRankLookup(params.previousSnapshot, "classes"),
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
        return {
          id: `${commit.repoName}:${commit.sha}`,
          repoName: commit.repoName,
          label:
            matchedParticipant?.githubUsername ?? commit.authorGithubUsername ?? commit.authorName ?? "unknown",
          committedAt: commit.committedAt,
          summary: (commit.messageSummary ?? "commit").replace(/[<>]/g, "").slice(0, 100),
          attributionStatus: commit.attributionStatus,
          detectedBots: commit.detectedBots,
          commitUrl: commit.commitUrl,
          branches: commit.sourceBranches,
          additions: commit.additions,
          deletions: commit.deletions,
          changedFiles: commit.changedFiles,
        }
      }),
    heatmap: [...heatmapCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
    unknownUsers: params.unknownUsers ?? [],
  }
}

function participantIdsForCommit(commit: CommitRecord): string[] {
  const ids =
    commit.matchedParticipants?.map((match) => match.participantId) ??
    (commit.participantId ? [commit.participantId] : [])
  return [...new Set(ids)]
}

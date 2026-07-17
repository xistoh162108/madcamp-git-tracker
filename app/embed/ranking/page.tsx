import path from "node:path"
import { RankingMiniCard, type RankingMiniEntry } from "@/components/ranking-mini-card"
import buildTimeSnapshot from "@/public/data/snapshots/seed.json"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"
import { loadConfig } from "@/src/config/load-config"
import { resolveCurrentWeek } from "@/src/config/schema"
import { loadParticipantClasses } from "@/src/participants/load-participant-classes"
import { readSnapshotFallback } from "@/src/snapshot/fallback"

export const dynamic = "force-dynamic"

export default async function RankingEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; limit?: string; class?: string }>
}) {
  const { week, limit, class: classParam } = await searchParams
  const config = loadConfig()
  // No explicit ?week= override: default to the active camp week while the camp is running (so the
  // embed matches the live leaderboard's own default view), and fall back to the all-time snapshot
  // once there's no active week left (camp over) -- an embed left on a slide/site shouldn't keep
  // pointing at week 4 forever after the camp ends.
  const weekNumber = week ? Number(week) : resolveCurrentWeek(config)
  const snapshotPath = weekNumber
    ? path.join(process.cwd(), "public", "data", "snapshots", `${config.season}-w${weekNumber}.json`)
    : path.join(process.cwd(), "public", "data", "snapshots", "latest.json")
  const snapshot = readSnapshotFallback<AggregatedSnapshot>(
    snapshotPath,
    readSnapshotFallback<AggregatedSnapshot>(
      path.join(process.cwd(), "public", "data", "snapshots", "latest.json"),
      buildTimeSnapshot as AggregatedSnapshot,
    ),
  )

  const limitNumber = Math.min(20, Math.max(1, Number(limit) || 5))
  const classOf = loadParticipantClasses()
  const personal = classParam
    ? snapshot.rankings.personal.filter((entry) => String(classOf.get(entry.meta ?? entry.id)) === classParam)
    : snapshot.rankings.personal

  const entries: RankingMiniEntry[] = [...personal]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limitNumber)
    .map((entry, index) => ({ rank: index + 1, name: entry.label, score: entry.score ?? 0, commits: entry.commits }))

  const weekLabel = config.weeks.find((w) => w.week === (weekNumber ?? snapshot.currentWeek))?.label ?? "전체 기간"
  const classLabel = classParam ? `${classParam}분반` : undefined

  return (
    <div className="p-3">
      <meta httpEquiv="refresh" content="60" />
      <RankingMiniCard
        weekLabel={weekLabel}
        classLabel={classLabel}
        entries={entries}
        totalCommits={snapshot.summary.totalCommits}
        activeParticipants={snapshot.summary.activeParticipants}
        updatedAtKst={snapshot.generatedAtKst}
      />
    </div>
  )
}

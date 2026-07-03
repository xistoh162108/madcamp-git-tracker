import path from "node:path"
import { RankingMiniCard, type RankingMiniEntry } from "@/components/ranking-mini-card"
import buildTimeSnapshot from "@/public/data/snapshots/seed.json"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"
import { loadConfig } from "@/src/config/load-config"
import { readSnapshotFallback } from "@/src/snapshot/fallback"

export const dynamic = "force-dynamic"

function classOfRepo(repoName?: string): string | undefined {
  const match = repoName?.match(/w\d+-c(\d+)-\d+/)
  return match ? match[1] : undefined
}

export default async function RankingEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; limit?: string; class?: string }>
}) {
  const { week, limit, class: classParam } = await searchParams
  const config = loadConfig()
  const weekNumber = week ? Number(week) : null
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
  const personal = classParam
    ? snapshot.rankings.personal.filter((entry) => {
        const key = entry.meta ?? entry.id
        const repoName = snapshot.activityFeed.find((item) => item.label === key || item.label === entry.id)?.repoName
        return classOfRepo(repoName) === classParam
      })
    : snapshot.rankings.personal

  const entries: RankingMiniEntry[] = personal
    .slice(0, limitNumber)
    .map((entry, index) => ({ rank: index + 1, name: entry.label, commits: entry.commits }))

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

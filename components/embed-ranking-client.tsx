"use client"

import { useSearchParams } from "next/navigation"
import { RankingMiniCard, type RankingMiniEntry } from "@/components/ranking-mini-card"

interface EmbedEntry {
  id: string
  name: string
  score: number
  commits: number
  classNumber: number | null
}

interface EmbedRankingClientProps {
  entries: EmbedEntry[]
  totalCommits: number
  activeParticipants: number
  updatedAtKst: string
}

// Static export has no server left to parse `?class=`/`?limit=` per request, so an already-frozen
// full ranking list is shipped to the client and filtered here instead -- keeps existing embeds
// (pasted into slides/sites with a `?class=` query string) working unchanged.
export function EmbedRankingClient({
  entries,
  totalCommits,
  activeParticipants,
  updatedAtKst,
}: EmbedRankingClientProps) {
  const searchParams = useSearchParams()
  const classParam = searchParams.get("class")
  const limitNumber = Math.min(20, Math.max(1, Number(searchParams.get("limit")) || 5))

  const filtered = classParam ? entries.filter((entry) => String(entry.classNumber) === classParam) : entries

  const rankedEntries: RankingMiniEntry[] = filtered
    .slice(0, limitNumber)
    .map((entry, index) => ({ rank: index + 1, name: entry.name, score: entry.score, commits: entry.commits }))

  return (
    <RankingMiniCard
      weekLabel="전체 기간"
      classLabel={classParam ? `${classParam}분반` : undefined}
      entries={rankedEntries}
      totalCommits={totalCommits}
      activeParticipants={activeParticipants}
      updatedAtKst={updatedAtKst}
      live={false}
    />
  )
}

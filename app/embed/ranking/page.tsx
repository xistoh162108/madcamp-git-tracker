import { Suspense } from "react"
import { EmbedRankingClient } from "@/components/embed-ranking-client"
import { frozenLatestSnapshot } from "@/src/snapshot/frozen"
import { loadParticipantClasses } from "@/src/participants/load-participant-classes"

// Camp is over -- always the all-time (전체) ranking now, frozen at build time. `?class=`/`?limit=`
// still work (handled client-side, see EmbedRankingClient) so existing embeds pasted into slides
// keep working; `?week=` no longer has anything to select between.
export default function RankingEmbedPage() {
  const classOf = loadParticipantClasses()
  const entries = frozenLatestSnapshot.rankings.personal
    .map((entry) => ({
      id: entry.id,
      name: entry.label,
      score: entry.score ?? 0,
      commits: entry.commits,
      classNumber: classOf.get(entry.meta ?? entry.id) ?? null,
    }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="p-3">
      <Suspense fallback={null}>
        <EmbedRankingClient
          entries={entries}
          totalCommits={frozenLatestSnapshot.summary.totalCommits}
          activeParticipants={frozenLatestSnapshot.summary.activeParticipants}
          updatedAtKst={frozenLatestSnapshot.generatedAtKst}
        />
      </Suspense>
    </div>
  )
}

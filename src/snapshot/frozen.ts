// Single source of truth for the frozen, build-time-bundled snapshot data used by the static
// (post-camp) pages. Unlike the live/dynamic pages, these are plain static imports resolved at
// `next build` time -- no `fs` reads, no per-request freshness, correct for a camp that's over.
import w1 from "@/public/data/snapshots/2026-summer-w1.json"
import w2 from "@/public/data/snapshots/2026-summer-w2.json"
import w3 from "@/public/data/snapshots/2026-summer-w3.json"
import w4 from "@/public/data/snapshots/2026-summer-w4.json"
import latest from "@/public/data/snapshots/latest.json"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"

export const frozenWeekSnapshots: Record<number, AggregatedSnapshot> = {
  1: w1 as unknown as AggregatedSnapshot,
  2: w2 as unknown as AggregatedSnapshot,
  3: w3 as unknown as AggregatedSnapshot,
  4: w4 as unknown as AggregatedSnapshot,
}

export const frozenLatestSnapshot = latest as unknown as AggregatedSnapshot

export function frozenSnapshotForWeek(week: number | null | undefined): AggregatedSnapshot {
  if (!week) return frozenLatestSnapshot
  return frozenWeekSnapshots[week] ?? frozenLatestSnapshot
}

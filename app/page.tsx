import path from "node:path"
import { TopNav } from "@/components/top-nav"
import { LiveDashboard } from "@/components/live-dashboard"
import buildTimeSnapshot from "@/public/data/snapshots/seed.json"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"
import { loadConfig } from "@/src/config/load-config"
import { resolveCurrentWeek } from "@/src/config/schema"
import { readSnapshotFallback } from "@/src/snapshot/fallback"

export const dynamic = "force-dynamic"

export default function Page() {
  const latestSnapshot = readSnapshotFallback<AggregatedSnapshot>(
    path.join(process.cwd(), "public", "data", "snapshots", "latest.json"),
    buildTimeSnapshot as AggregatedSnapshot,
  )
  const config = loadConfig()
  const currentWeek = resolveCurrentWeek(config) ?? latestSnapshot.currentWeek

  return (
    <div className="min-h-screen">
      <TopNav />
      <LiveDashboard
        initialSnapshot={latestSnapshot}
        displayName={config.displayName}
        weeks={config.weeks}
        currentWeek={currentWeek}
      />
    </div>
  )
}

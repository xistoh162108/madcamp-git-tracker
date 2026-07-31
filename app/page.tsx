import { TopNav } from "@/components/top-nav"
import { LiveDashboard } from "@/components/live-dashboard"
import { frozenLatestSnapshot } from "@/src/snapshot/frozen"
import { loadConfig } from "@/src/config/load-config"

// Camp is over -- this is now a frozen static export, not a live server. No `dynamic`/`fs` reads,
// no clock-dependent "current week" resolution: the leaderboard always opens on the all-time tab.
export default function Page() {
  const config = loadConfig()

  return (
    <div className="min-h-screen">
      <TopNav />
      <LiveDashboard
        initialSnapshot={frozenLatestSnapshot}
        displayName={config.displayName}
        weeks={config.weeks}
        currentWeek={null}
        live={false}
      />
    </div>
  )
}

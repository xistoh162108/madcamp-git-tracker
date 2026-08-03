import { TopNav } from "@/components/top-nav"
import { LiveDashboard } from "@/components/live-dashboard"
import { frozenLatestSnapshot, frozenWeekSnapshots } from "@/src/snapshot/frozen"
import { loadConfig } from "@/src/config/load-config"

// Camp is over -- this is now a frozen static export, not a live server. No `dynamic`/`fs` reads,
// no clock-dependent "current week" resolution: the leaderboard always opens on the all-time tab.
export default function Page() {
  const config = loadConfig()
  const weekSnapshots = {
    all: frozenLatestSnapshot,
    ...Object.fromEntries(Object.entries(frozenWeekSnapshots).map(([week, snapshot]) => [`w${week}`, snapshot])),
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <LiveDashboard
        initialSnapshot={frozenLatestSnapshot}
        displayName={config.displayName}
        weeks={config.weeks}
        currentWeek={null}
        live={false}
        weekSnapshots={weekSnapshots}
      />
    </div>
  )
}

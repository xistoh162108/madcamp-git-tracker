import Link from "next/link"
import { Activity, Zap } from "lucide-react"
import snapshot from "@/public/data/snapshots/latest.json"
import { loadConfig } from "@/src/config/load-config"
import { resolveCurrentWeek } from "@/src/config/schema"

export function TopNav() {
  const config = loadConfig()
  const currentWeek = resolveCurrentWeek(config) ?? snapshot.currentWeek
  const activeWeek = config.weeks.find((w) => w.week === currentWeek)

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
            <Zap className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold tracking-tight">몰입 랭킹</span>
          <span className="hidden rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">
            {config.displayName}
          </span>
        </Link>

        <div className="hidden items-center gap-1.5 rounded-md border border-border/70 bg-card/60 px-2.5 py-1 text-xs md:flex">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">현재 주차</span>
          <span className="font-semibold text-foreground">{activeWeek?.label ?? "기간 외"}</span>
          {activeWeek ? (
            <span className="flex items-center gap-1 rounded-full bg-positive/15 px-1.5 py-0.5 text-[10px] font-medium text-positive">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-positive" />
              진행 중
            </span>
          ) : null}
        </div>
      </div>
    </header>
  )
}

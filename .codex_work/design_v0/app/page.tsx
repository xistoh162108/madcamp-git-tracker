import { TopNav } from "@/components/top-nav"
import { MetricCards } from "@/components/metric-cards"
import { LeaderboardSection } from "@/components/leaderboard-section"
import { DailyHighlights } from "@/components/daily-highlights"
import { SyncStatusCard } from "@/components/sync-status-card"
import { ActivityFeed } from "@/components/activity-feed"
import { TrendCharts } from "@/components/trend-charts"
import { ContributionHeatmap } from "@/components/contribution-heatmap"
import { Notice } from "@/components/notice"
import { heatmap, contributionNoticeText, kstNoticeText } from "@/lib/data"

export default function Page() {
  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
        {/* Compact header */}
        <div className="mb-5 flex flex-col gap-1">
          <h1 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
            커밋으로 보는 몰입의 흐름
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            팀별 repository 활동을 기반으로 이번 주와 전체 기간의 개발 흐름을 확인하세요.
          </p>
        </div>

        {/* Metrics */}
        <MetricCards />

        {/* Main grid */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
          <LeaderboardSection />

          <aside className="flex flex-col gap-4">
            <DailyHighlights />
            <SyncStatusCard />
            <ActivityFeed />
          </aside>
        </div>

        {/* Heatmap */}
        <section className="mt-5 rounded-xl border border-border/70 bg-card/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">활동 추이 · contribution heatmap</h2>
            <span className="text-[11px] text-muted-foreground">최근 16주 · KST</span>
          </div>
          <ContributionHeatmap grid={heatmap} />
        </section>

        {/* Charts */}
        <div className="mt-4">
          <TrendCharts />
        </div>

        {/* Footer notices */}
        <div className="mt-6 space-y-2 border-t border-border/60 pt-5">
          <Notice>{contributionNoticeText}</Notice>
          <Notice>{kstNoticeText}</Notice>
        </div>
      </main>
    </div>
  )
}

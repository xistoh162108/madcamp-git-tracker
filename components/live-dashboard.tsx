"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Activity, ArrowUpRight, Bell, Flame, Trophy } from "lucide-react"
import { MetricCards } from "@/components/metric-cards"
import { LeaderboardSection } from "@/components/leaderboard-section"
import { DailyHighlights } from "@/components/daily-highlights"
import { ActivityFeed } from "@/components/activity-feed"
import { TrendCharts } from "@/components/trend-charts"
import { Notice } from "@/components/notice"
import { contributionNoticeText, kstNoticeText } from "@/lib/data"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"
import type { WeekConfig } from "@/src/config/schema"

const SNAPSHOT_REFRESH_MS = 60 * 1000

interface LiveDashboardProps {
  initialSnapshot: AggregatedSnapshot
  displayName: string
  weeks: WeekConfig[]
  currentWeek: number | null
}

interface LiveEvent {
  id: string
  kind: "leader" | "surge" | "activity" | "burst"
  title: string
  detail: string
}

function fmtRange(startAt?: string, endAt?: string) {
  const start = startAt?.match(/\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  const end = endAt?.match(/\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!start || !end) return "기간 외"
  return `${start[1]}.${start[2]} ${start[3]}:${start[4]} ~ ${end[1]}.${end[2]} ${end[3]}:${end[4]} KST`
}

function timeLeftLabel(endAt?: string) {
  if (!endAt) return "기간 외"
  const diff = Date.parse(endAt) - Date.now()
  if (!Number.isFinite(diff) || diff <= 0) return "마감"
  const totalHours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `${days}일 ${hours}시간`
  return `${Math.max(1, hours)}시간`
}

function rankMap(snapshot: AggregatedSnapshot) {
  return new Map(snapshot.rankings.personal.map((entry) => [entry.id, entry]))
}

function detectLiveEvents(previous: AggregatedSnapshot, next: AggregatedSnapshot): LiveEvent[] {
  const events: LiveEvent[] = []
  const previousLeader = previous.rankings.personal[0]
  const nextLeader = next.rankings.personal[0]
  if (previousLeader && nextLeader && previousLeader.id !== nextLeader.id) {
    events.push({
      id: `leader:${next.generatedAt}:${nextLeader.id}`,
      kind: "leader",
      title: "1위 교체",
      detail: `${nextLeader.label}님이 개인 랭킹 1위로 올라섰습니다.`,
    })
  }

  const oldRanks = rankMap(previous)
  for (const entry of next.rankings.personal.slice(0, 12)) {
    const old = oldRanks.get(entry.id)
    if (!old) continue
    const diff = old.rank - entry.rank
    if (diff >= 2) {
      events.push({
        id: `surge:${next.generatedAt}:${entry.id}`,
        kind: "surge",
        title: "급상승",
        detail: `${entry.label}님이 ${diff}계단 상승했습니다.`,
      })
    }
  }

  const previousActivities = new Set(previous.activityFeed.map((item) => item.id))
  const newActivities = next.activityFeed.filter((item) => !previousActivities.has(item.id)).slice(0, 3)
  for (const item of newActivities) {
    events.push({
      id: `activity:${next.generatedAt}:${item.id}`,
      kind: "activity",
      title: "새 활동 반영",
      detail: `${item.label} · ${item.repoName.replace(/^.*?(w\d+-c\d+-\d+)$/, "$1")}`,
    })
  }

  const previousLatest = previous.heatmap.at(-1)?.count ?? 0
  const nextLatest = next.heatmap.at(-1)?.count ?? 0
  if (nextLatest - previousLatest >= 5) {
    events.push({
      id: `burst:${next.generatedAt}:${nextLatest}`,
      kind: "burst",
      title: "활동 폭발",
      detail: `최근 집계일 커밋이 ${nextLatest - previousLatest}개 늘었습니다.`,
    })
  }

  return events.slice(0, 4)
}

function eventIcon(kind: LiveEvent["kind"]) {
  if (kind === "leader") return Trophy
  if (kind === "surge") return ArrowUpRight
  if (kind === "burst") return Flame
  return Bell
}

function LiveEventStack({ events }: { events: LiveEvent[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
      <AnimatePresence>
        {events.map((event) => {
          const Icon = eventIcon(event.kind)
          return (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, x: 28, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.96 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="leaderboard-arena overflow-hidden rounded-xl border border-primary/25 bg-card/95 p-3 shadow-2xl shadow-background/60 backdrop-blur"
            >
              <div className="flex items-start gap-2.5">
                <span className="rank-pulse flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{event.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{event.detail}</p>
                </div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted/50">
                <motion.div
                  className="progress-glint relative h-full overflow-hidden rounded-full bg-primary"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 8, ease: "linear" }}
                />
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export function LiveDashboard({ initialSnapshot, displayName, weeks, currentWeek }: LiveDashboardProps) {
  const [mounted, setMounted] = useState(false)
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [selectedWeekKey, setSelectedWeekKey] = useState(currentWeek ? `w${currentWeek}` : "all")
  const [events, setEvents] = useState<LiveEvent[]>([])
  const snapshotRef = useRef(initialSnapshot)
  const selectedWeekNumber = selectedWeekKey.startsWith("w") ? Number(selectedWeekKey.slice(1)) : null
  const activeWeek = weeks.find((week) => week.week === (selectedWeekNumber ?? currentWeek))
  const selectedWeekStatus =
    selectedWeekNumber && currentWeek
      ? selectedWeekNumber < currentWeek
        ? "종료"
        : selectedWeekNumber === currentWeek
          ? "진행 중"
          : "기간 외"
      : selectedWeekNumber
        ? "기간 외"
        : "전체 기간"

  const leader = snapshot.rankings.personal[0]
  const runnerUp = snapshot.rankings.personal[1]
  const leaderGap = leader && runnerUp ? Math.max(0, leader.commits - runnerUp.commits) : 0
  const timeLeft = selectedWeekNumber ? timeLeftLabel(activeWeek?.endAt) : "-"
  const pushEvents = useCallback((nextEvents: LiveEvent[]) => {
    if (nextEvents.length === 0) return
    setEvents((current) => [...nextEvents, ...current].slice(0, 5))
    window.setTimeout(() => {
      setEvents((current) => current.filter((event) => !nextEvents.some((nextEvent) => nextEvent.id === event.id)))
    }, 8200)
  }, [])

  const loadSnapshot = useCallback(
    async (key: string, notify = false) => {
      const endpoint =
        key === "all"
          ? `/api/snapshots/latest?ts=${Date.now()}`
          : `/api/snapshots/week/${key.slice(1)}?ts=${Date.now()}`
      const response = await fetch(endpoint, { cache: "no-store" })
      if (!response.ok) return
      const next = (await response.json()) as AggregatedSnapshot
      const previous = snapshotRef.current
      if (next.generatedAt === previous.generatedAt) return
      snapshotRef.current = next
      setSnapshot(next)
      if (notify) pushEvents(detectLiveEvents(previous, next))
    },
    [pushEvents],
  )

  const refreshSnapshot = useCallback(async () => {
    if (selectedWeekKey !== "all" && selectedWeekKey !== `w${currentWeek}`) return
    await loadSnapshot(selectedWeekKey, true)
  }, [currentWeek, loadSnapshot, selectedWeekKey])

  const handleWeekSelect = useCallback(
    (key: string) => {
      setSelectedWeekKey(key)
      void loadSnapshot(key, false)
    },
    [loadSnapshot],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    void refreshSnapshot()
    const interval = window.setInterval(() => {
      void refreshSnapshot()
    }, SNAPSHOT_REFRESH_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshSnapshot()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [mounted, refreshSnapshot])

  if (!mounted) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
        <div className="leaderboard-arena relative mb-4 overflow-hidden rounded-2xl border border-border/70 px-4 py-4 sm:px-5">
          <p className="text-xs font-medium text-muted-foreground">몰입 랭킹 · {displayName}</p>
          <h1 className="mt-1 text-balance text-2xl font-bold tracking-tight">
            {currentWeek ? `${currentWeek}주차 커밋 리그보드` : "GitHub 커밋 리그보드"}
          </h1>
        </div>
      </main>
    )
  }

  return (
    <>
      <LiveEventStack events={events} />
      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
        <div className="leaderboard-arena leaderboard-scan relative mb-4 overflow-hidden rounded-2xl border border-border/70 px-4 py-4 sm:px-5">
          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">몰입 랭킹 · {displayName}</p>
              <h1 className="mt-1 text-balance text-2xl font-bold tracking-tight">
                {selectedWeekNumber ? `${selectedWeekNumber}주차 커밋 리그보드` : "GitHub 커밋 리그보드"}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-positive/25 bg-positive/10 px-2.5 py-1 text-[11px] font-medium text-positive">
                  <Activity className="h-3.5 w-3.5" />
                  live board
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
                  <Trophy className="h-3.5 w-3.5" />
                  weekly league
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  <Flame className="h-3.5 w-3.5" />
                  10분마다 업데이트
                </span>
              </div>
            </div>
            <div className="text-left text-xs text-muted-foreground sm:text-right">
              <p>
                <span className="font-semibold text-positive">{selectedWeekStatus}</span>
                <span className="mx-1.5 text-border">·</span>
                {fmtRange(activeWeek?.startAt, activeWeek?.endAt)}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-left sm:grid-cols-4 sm:text-right">
                <div>
                  <p className="text-[10px] text-muted-foreground">마감까지</p>
                  <p className="font-semibold text-foreground tabular">{timeLeft}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">현재 1위</p>
                  <p className="truncate font-semibold text-gold">
                    {leader ? `${leader.label} · ${leader.commits} commits` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">2위와 격차</p>
                  <p className="font-semibold text-foreground tabular">{leader ? `${leaderGap} commits` : "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">이번 주 반영</p>
                  <p className="font-semibold text-primary tabular">{snapshot.summary.totalCommits} commits</p>
                </div>
              </div>
              <p className="mt-2">마지막 업데이트 {snapshot.generatedAtKst}</p>
            </div>
          </div>
        </div>

        <MetricCards snapshot={snapshot} />

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <LeaderboardSection
            snapshot={snapshot}
            weeks={weeks}
            currentWeek={currentWeek}
            selectedWeekKey={selectedWeekKey}
            onWeekSelect={handleWeekSelect}
          />

          <aside className="flex flex-col gap-4">
            <DailyHighlights snapshot={snapshot} />
            <ActivityFeed snapshot={snapshot} />
          </aside>
        </div>

        <div className="mt-5">
          <TrendCharts snapshot={snapshot} weeks={weeks} currentWeek={currentWeek} />
        </div>

        <div className="mt-6 space-y-2 border-t border-border/60 pt-5">
          <Notice>{contributionNoticeText}</Notice>
          <Notice>{kstNoticeText}</Notice>
        </div>
      </main>
    </>
  )
}

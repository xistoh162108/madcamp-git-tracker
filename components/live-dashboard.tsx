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
const SEEN_LIVE_EVENTS_KEY = "madcamp:seen-live-events:v1"
const MAX_SEEN_LIVE_EVENTS = 160

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

type RankKind = "personal" | "teams" | "classes"

function rankMap(snapshot: AggregatedSnapshot, kind: RankKind) {
  return new Map(snapshot.rankings[kind].map((entry) => [entry.id, entry]))
}

function hasScores(snapshot: AggregatedSnapshot, kind: RankKind) {
  return snapshot.rankings[kind].some((entry) => typeof entry.score === "number")
}

function shortLabel(kind: RankKind, label: string) {
  return kind === "teams" ? label.replace(/^.*?(w\d+-c\d+-\d+)$/, "$1") : label
}

// Shared leader-swap / rank-surge / score-gain detector, reused for personal, team, and class
// rankings -- teams and classes have far fewer entries than personal, so surgeDiff/topN are tuned
// per kind (a 2-rank jump is common noise among 3 classes but meaningful among 50 people).
function rankMovementEvents(
  previous: AggregatedSnapshot,
  next: AggregatedSnapshot,
  kind: RankKind,
  opts: {
    suffix: string
    leaderTitle: string
    surgeTitle: string
    scoreTitle: string
    surgeDiff: number
    topN: number
    scoreGainThreshold: number
  },
): LiveEvent[] {
  const events: LiveEvent[] = []
  if (!hasScores(previous, kind) || !hasScores(next, kind)) return events

  const previousLeader = previous.rankings[kind][0]
  const nextLeader = next.rankings[kind][0]
  if (previousLeader && nextLeader && previousLeader.id !== nextLeader.id) {
    events.push({
      id: `${kind}-leader:${next.generatedAt}:${nextLeader.id}`,
      kind: "leader",
      title: opts.leaderTitle,
      detail: `${shortLabel(kind, nextLeader.label)}${opts.suffix} ${((nextLeader.score ?? 0) - (previousLeader.score ?? 0)).toFixed(1)}점 차이를 만들었습니다.`,
    })
  }

  const oldRanks = rankMap(previous, kind)
  for (const entry of next.rankings[kind].slice(0, opts.topN)) {
    const old = oldRanks.get(entry.id)
    if (!old) continue
    const diff = old.rank - entry.rank
    const scoreGain = (entry.score ?? 0) - (old.score ?? 0)
    if (diff >= opts.surgeDiff) {
      events.push({
        id: `${kind}-surge:${next.generatedAt}:${entry.id}`,
        kind: "surge",
        title: opts.surgeTitle,
        detail: `${shortLabel(kind, entry.label)}${opts.suffix} ${diff}계단 상승했습니다.${scoreGain > 0 ? ` +${scoreGain.toFixed(1)}점` : ""}`,
      })
    } else if (scoreGain >= opts.scoreGainThreshold && entry.rank <= opts.topN) {
      events.push({
        id: `${kind}-score:${next.generatedAt}:${entry.id}`,
        kind: "surge",
        title: opts.scoreTitle,
        detail: `${shortLabel(kind, entry.label)}${opts.suffix} 이번 집계에서 +${scoreGain.toFixed(1)}점을 얻었습니다.`,
      })
    }
  }
  return events
}

function detectLiveEvents(previous: AggregatedSnapshot, next: AggregatedSnapshot): LiveEvent[] {
  const events: LiveEvent[] = []

  events.push(
    ...rankMovementEvents(previous, next, "personal", {
      suffix: "님이",
      leaderTitle: "1위 교체",
      surgeTitle: "점수 랭킹 급상승",
      scoreTitle: "점수 상승",
      surgeDiff: 2,
      topN: 12,
      scoreGainThreshold: 2,
    }),
  )
  events.push(
    ...rankMovementEvents(previous, next, "teams", {
      suffix: " 팀이",
      leaderTitle: "팀 1위 교체",
      surgeTitle: "팀 랭킹 급상승",
      scoreTitle: "팀 점수 상승",
      surgeDiff: 2,
      topN: 10,
      scoreGainThreshold: 2,
    }),
  )
  events.push(
    ...rankMovementEvents(previous, next, "classes", {
      suffix: "이",
      leaderTitle: "분반 1위 교체",
      surgeTitle: "분반 순위 변동",
      scoreTitle: "분반 점수 상승",
      surgeDiff: 1,
      topN: 3,
      scoreGainThreshold: 1,
    }),
  )

  if (!hasScores(previous, "personal") && hasScores(next, "personal")) {
    events.push({
      id: `score-ready:${next.generatedAt}`,
      kind: "leader",
      title: "점수 집계 반영",
      detail: "새 점수 기준으로 랭킹이 갱신되었습니다.",
    })
  }

  const previousActivities = new Set(previous.activityFeed.map((item) => item.id))
  const newActivities = next.activityFeed.filter((item) => !previousActivities.has(item.id)).slice(0, 3)
  for (const item of newActivities) {
    const scoreLabel = typeof item.score === "number" ? ` · ${item.score.toFixed(1)}점` : ""
    events.push({
      id: `activity:${next.generatedAt}:${item.id}`,
      kind: "activity",
      title: "새 활동 반영",
      detail: `${item.label} · ${item.repoName.replace(/^.*?(w\d+-c\d+-\d+)$/, "$1")}${scoreLabel}`,
    })
  }

  const previousLatest = previous.heatmap.at(-1)?.count ?? 0
  const nextLatest = next.heatmap.at(-1)?.count ?? 0
  if (nextLatest - previousLatest >= 5) {
    events.push({
      id: `burst:${next.generatedAt}:${nextLatest}`,
      kind: "burst",
      title: "활동 증가",
      detail: `최근 집계일 커밋이 ${nextLatest - previousLatest}개 늘었습니다.`,
    })
  }

  return events.slice(0, 6)
}

function eventIcon(kind: LiveEvent["kind"]) {
  if (kind === "leader") return Trophy
  if (kind === "surge") return ArrowUpRight
  if (kind === "burst") return Flame
  return Bell
}

function readSeenLiveEventIds() {
  if (typeof window === "undefined") return new Set<string>()
  try {
    const raw = window.sessionStorage.getItem(SEEN_LIVE_EVENTS_KEY)
    const parsed = raw ? (JSON.parse(raw) as string[]) : []
    return new Set(parsed.filter((item) => typeof item === "string"))
  } catch {
    return new Set<string>()
  }
}

function writeSeenLiveEventIds(ids: string[]) {
  try {
    window.sessionStorage.setItem(SEEN_LIVE_EVENTS_KEY, JSON.stringify(ids.slice(-MAX_SEEN_LIVE_EVENTS)))
  } catch {
    // Notification dedupe is best-effort; private browsing/storage limits should not break the dashboard.
  }
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
  // Trend charts (일별 커밋 추이 / 스프린트 보드 / 시간대별 분포) intentionally always show the full-camp,
  // all-weeks picture regardless of which week is selected for the leaderboard above -- kept in a
  // separate snapshot/state so switching the week selector never scopes them down to a single week.
  const [allSnapshot, setAllSnapshot] = useState(initialSnapshot)
  const [selectedWeekKey, setSelectedWeekKey] = useState(currentWeek ? `w${currentWeek}` : "all")
  const [events, setEvents] = useState<LiveEvent[]>([])
  const snapshotRef = useRef(initialSnapshot)
  const allSnapshotRef = useRef(initialSnapshot)
  // Live "1위 교체" / "점수 상승" / "새 활동 반영" notifications must always reflect the current camp
  // week's own score movement, never whichever tab happens to be selected -- switching to the "전체"
  // tab must not start comparing all-time cumulative totals as if they were this week's deltas.
  const notifySnapshotRef = useRef(initialSnapshot)
  const loadingRef = useRef(false)
  const loadingAllRef = useRef(false)
  const loadingNotifyRef = useRef(false)
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
  const leaderGap = leader && runnerUp ? Math.max(0, (leader.score ?? 0) - (runnerUp.score ?? 0)) : 0
  const timeLeft = selectedWeekNumber ? timeLeftLabel(activeWeek?.endAt) : "-"
  const pushEvents = useCallback((nextEvents: LiveEvent[]) => {
    if (nextEvents.length === 0) return
    const seen = readSeenLiveEventIds()
    const unseen = nextEvents.filter((event) => !seen.has(event.id))
    if (unseen.length === 0) return
    writeSeenLiveEventIds([...seen, ...unseen.map((event) => event.id)])
    setEvents((current) => [...unseen, ...current].slice(0, 5))
    window.setTimeout(() => {
      setEvents((current) => current.filter((event) => !unseen.some((nextEvent) => nextEvent.id === event.id)))
    }, 8200)
  }, [])

  const loadSnapshot = useCallback(async (key: string) => {
    // Guard against overlapping fetches (e.g. the 1-min interval firing while a
    // visibilitychange-triggered refresh is still in flight) racing on snapshotRef.
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const endpoint =
        key === "all"
          ? `/api/snapshots/latest?ts=${Date.now()}`
          : `/api/snapshots/week/${key.slice(1)}?ts=${Date.now()}`
      const response = await fetch(endpoint, { cache: "no-store" })
      if (!response.ok) return
      const next = (await response.json()) as AggregatedSnapshot
      if (next.generatedAt === snapshotRef.current.generatedAt) return
      snapshotRef.current = next
      setSnapshot(next)
    } finally {
      loadingRef.current = false
    }
  }, [])

  const refreshSnapshot = useCallback(async () => {
    await loadSnapshot(selectedWeekKey)
  }, [loadSnapshot, selectedWeekKey])

  const refreshAllSnapshot = useCallback(async () => {
    if (loadingAllRef.current) return
    loadingAllRef.current = true
    try {
      const response = await fetch(`/api/snapshots/latest?ts=${Date.now()}`, { cache: "no-store" })
      if (!response.ok) return
      const next = (await response.json()) as AggregatedSnapshot
      if (next.generatedAt === allSnapshotRef.current.generatedAt) return
      allSnapshotRef.current = next
      setAllSnapshot(next)
    } finally {
      loadingAllRef.current = false
    }
  }, [])

  // Dedicated poll for the live-event notifications, deliberately independent of the tab-selected
  // `snapshot` above -- always diffs the current week's own snapshot so "1위 교체"/"점수 상승" reflect
  // this week's score movement regardless of which tab (전체/특정 주차) is on screen. Camp-wide "after
  // the camp ends" ranking is a separate, non-live concern -- once there's no active week, there's
  // nothing week-scoped left to notify about, so this simply goes idle.
  const refreshWeekNotifications = useCallback(async () => {
    if (!currentWeek) return
    if (loadingNotifyRef.current) return
    loadingNotifyRef.current = true
    const previous = notifySnapshotRef.current
    try {
      const response = await fetch(`/api/snapshots/week/${currentWeek}?ts=${Date.now()}`, { cache: "no-store" })
      if (!response.ok) return
      const next = (await response.json()) as AggregatedSnapshot
      if (next.generatedAt === previous.generatedAt) return
      notifySnapshotRef.current = next
      pushEvents(detectLiveEvents(previous, next))
    } finally {
      loadingNotifyRef.current = false
    }
  }, [currentWeek, pushEvents])

  const handleWeekSelect = useCallback(
    (key: string) => {
      setSelectedWeekKey(key)
      void loadSnapshot(key)
    },
    [loadSnapshot],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    void refreshSnapshot()
    void refreshAllSnapshot()
    void refreshWeekNotifications()
    const interval = window.setInterval(() => {
      void refreshSnapshot()
      void refreshAllSnapshot()
      void refreshWeekNotifications()
    }, SNAPSHOT_REFRESH_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshSnapshot()
        void refreshAllSnapshot()
        void refreshWeekNotifications()
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [mounted, refreshSnapshot, refreshAllSnapshot, refreshWeekNotifications])

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
                  실시간 집계
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
                  <Trophy className="h-3.5 w-3.5" />
                  주간 리그
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  <Flame className="h-3.5 w-3.5" />
                  1분마다 업데이트
                </span>
              </div>
            </div>
            <div className="text-left text-xs text-muted-foreground sm:text-right">
              <p>
                <span className="font-semibold text-positive">{selectedWeekStatus}</span>
                <span className="mx-1.5 text-border">·</span>
                {fmtRange(activeWeek?.startAt, activeWeek?.endAt)}
              </p>

              <div className="mt-3 flex items-center gap-2.5 sm:justify-end">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10">
                  <Trophy className="h-4.5 w-4.5 text-gold" />
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] text-muted-foreground">현재 1위</p>
                  <p className="truncate">
                    <span className="text-lg font-bold text-foreground">{leader ? leader.label : "-"}</span>
                    {leader ? (
                      <span className="ml-1.5 font-mono text-sm font-semibold text-gold tabular">
                        {(leader.score ?? 0).toFixed(1)}점
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-left sm:text-right">
                <div>
                  <p className="text-[10px] text-muted-foreground">2위와 격차</p>
                  <p className="font-semibold text-positive tabular">
                    {leader && runnerUp ? (leaderGap === 0 ? "공동 1위" : `+${leaderGap.toFixed(1)}점`) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">⏳ 남은 시간</p>
                  <p className="font-semibold text-foreground tabular">{timeLeft}</p>
                </div>
              </div>
              <p className="mt-2">마지막 업데이트 {snapshot.generatedAtKst}</p>
            </div>
          </div>
        </div>

        <MetricCards snapshot={snapshot} scope={selectedWeekKey === "all" ? "all" : "week"} />

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <LeaderboardSection
            snapshot={snapshot}
            weeks={weeks}
            currentWeek={currentWeek}
            selectedWeekKey={selectedWeekKey}
            onWeekSelect={handleWeekSelect}
          />

          <aside className="flex min-h-0 flex-col gap-4 lg:h-[900px]">
            <DailyHighlights snapshot={snapshot} />
            <ActivityFeed snapshot={snapshot} />
          </aside>
        </div>

        <div className="mt-5">
          <TrendCharts snapshot={allSnapshot} weeks={weeks} currentWeek={currentWeek} />
        </div>

        <div className="mt-6 space-y-2 border-t border-border/60 pt-5">
          <Notice>{contributionNoticeText}</Notice>
          <Notice>{kstNoticeText}</Notice>
        </div>
      </main>
    </>
  )
}

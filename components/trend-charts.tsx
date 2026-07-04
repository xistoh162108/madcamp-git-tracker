"use client"

import { motion } from "framer-motion"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { HourlyBarChart, SprintBoard } from "@/components/detail-charts"
import { dailyTrend } from "@/lib/data"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"
import type { WeekConfig } from "@/src/config/schema"

const tooltipStyle = {
  background: "hsl(222 26% 8%)",
  border: "1px solid hsl(220 16% 17%)",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(210 20% 92%)",
}

function SprintHeatmap({
  snapshot,
  weeks,
  currentWeek,
}: {
  snapshot?: AggregatedSnapshot
  weeks?: WeekConfig[]
  currentWeek?: number | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="rounded-xl border border-border/70 bg-card/70 p-4"
    >
      <h3 className="text-sm font-semibold">4주 스프린트 보드</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">각 칸은 하루를 의미하며, 색이 진할수록 커밋이 많습니다.</p>
      <div className="mt-4">
        <SprintBoard heatmap={normalizedHeatmap(snapshot)} weeks={weeks ?? []} currentWeek={currentWeek ?? null} />
      </div>
    </motion.div>
  )
}

export function TrendCharts({
  snapshot,
  weeks,
  currentWeek,
}: {
  snapshot?: AggregatedSnapshot
  weeks?: WeekConfig[]
  currentWeek?: number | null
}) {
  const heatmap = normalizedHeatmap(snapshot)
  const trend = heatmap.slice(-7).map((day) => ({ date: day.date.slice(5).replace("-", "."), commits: day.count }))
  const firstDay = trend[0]?.date
  const lastDay = trend.at(-1)?.date
  const trendSubtitle = firstDay && lastDay ? `${firstDay} - ${lastDay} · 전체 팀 합산` : "전체 팀 합산"
  const trendTotal = trend.reduce((sum, day) => sum + day.commits, 0)
  const dayOverDay = trend.length >= 2 ? trend[trend.length - 1]!.commits - trend[trend.length - 2]!.commits : null
  const hourly = normalizedHourly(snapshot)
  const peakHour = hourly.reduce((best, item) => (item.commits > best.commits ? item : best), hourly[0])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.35 }}
        className="rounded-xl border border-border/70 bg-card/70 p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">일별 커밋 추이</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{trendSubtitle}</p>
          </div>
          <div className="shrink-0 text-right text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground tabular">총 {trendTotal.toLocaleString()}</p>
            {dayOverDay !== null ? (
              <p className={dayOverDay >= 0 ? "text-positive" : "text-destructive"}>
                전일 대비 {dayOverDay >= 0 ? "+" : ""}
                {dayOverDay}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 17%)" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(220 16% 14%)" }} />
              <Bar dataKey="commits" name="커밋 수" fill="hsl(196 90% 54%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <SprintHeatmap snapshot={snapshot} weeks={weeks} currentWeek={currentWeek} />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.35 }}
        className="rounded-xl border border-border/70 bg-card/70 p-4 lg:col-span-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">시간대별 커밋 분포</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              시간대 패턴 분석 · KST 기준 · 현재 선택한 기간의 시간대별 평균 커밋 수
            </p>
          </div>
          {peakHour && peakHour.commits > 0 ? (
            <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
              피크 {Number(peakHour.hour)}시
            </span>
          ) : null}
        </div>
        <div className="mt-4">
          <HourlyBarChart data={hourly} name="평균 커밋 수" />
        </div>
      </motion.div>
    </div>
  )
}

function normalizedHeatmap(snapshot?: AggregatedSnapshot) {
  if (!snapshot) {
    return dailyTrend.map((day) => ({ date: `2026-${day.date.replace(".", "-")}`, count: day.commits }))
  }
  return snapshot.heatmap
}

// `snapshot.hourlyDistribution` is computed server-side from the full commit ledger (aggregate.ts),
// not from `activityFeed` -- activityFeed is capped at 200 most-recent commits for display, which
// would silently drop older hours from the average as commit volume grows past that cap.
function normalizedHourly(snapshot?: AggregatedSnapshot) {
  if (snapshot?.hourlyDistribution) return snapshot.hourlyDistribution
  return Array.from({ length: 24 }, (_, hour) => ({ hour: String(hour).padStart(2, "0"), commits: 0 }))
}

"use client"

import { motion } from "framer-motion"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { HourlyBarChart } from "@/components/detail-charts"
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

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date)
}

function dayLabel(iso: string) {
  const match = iso.match(/\d{4}-(\d{2})-(\d{2})/)
  return match ? `${match[1]}.${match[2]}` : iso
}

function weekdayLabel(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" }).format(new Date(iso))
}

function intensity(count: number, max: number) {
  if (count <= 0) return 0
  if (max <= 1) return 1
  return Math.max(1, Math.ceil((count / max) * 4))
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
  const heatmap = normalizedHeatmap(snapshot)
  const counts = new Map(heatmap.map((day) => [day.date, day.count]))
  const max = Math.max(1, ...[...counts.values()])
  const configuredWeeks = weeks?.slice(0, 4) ?? []
  const today = dateKey(new Date())
  const weekdays = ["월", "화", "수", "목", "금", "토", "일"]

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="rounded-xl border border-border/70 bg-card/70 p-4"
    >
      <h3 className="text-sm font-semibold">4주 스프린트 보드</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">캠프 기간 동안의 날짜별 활동 밀도</p>
      <div className="mt-4 space-y-2.5">
        <div className="grid grid-cols-[44px_1fr] items-center gap-2">
          <span />
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-muted-foreground">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </div>
        {configuredWeeks.map((week) => {
          const start = new Date(week.startAt)
          const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start)
            date.setDate(start.getDate() + index)
            const key = dateKey(date)
            const disabled = currentWeek ? week.week > currentWeek : false
            const count = disabled ? 0 : (counts.get(key) ?? 0)
            return { key, label: dayLabel(key), count, level: intensity(count, max), disabled, today: key === today }
          })
          return (
            <div key={week.week} className="grid grid-cols-[44px_1fr] items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{week.label}</span>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((day, dayIndex) => (
                  <motion.span
                    key={day.key}
                    title={`${weekdayLabel(day.key)} ${day.label} · ${day.disabled ? "예정" : `${day.count} commits`}`}
                    initial={{ opacity: 0, scale: 0.72 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={!day.disabled ? { scale: 1.16, y: -2 } : undefined}
                    transition={{ duration: 0.18, delay: week.week * 0.04 + dayIndex * 0.018 }}
                    className={[
                      "h-8 rounded-md border transition-colors",
                      day.disabled
                        ? "border-border/40 bg-muted/20 opacity-45"
                        : day.level === 0
                          ? "border-border/50 bg-muted/40"
                          : day.level === 1
                            ? "border-primary/20 bg-primary/15"
                            : day.level === 2
                              ? "border-primary/30 bg-primary/30"
                              : day.level === 3
                                ? "border-primary/40 bg-primary/55"
                                : "border-primary/60 bg-primary/80",
                      day.today ? "ring-1 ring-gold" : "",
                    ].join(" ")}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>낮음</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={[
                "h-2.5 w-5 rounded-sm",
                level === 0
                  ? "bg-muted/40"
                  : level === 1
                    ? "bg-primary/15"
                    : level === 2
                      ? "bg-primary/30"
                      : level === 3
                        ? "bg-primary/55"
                        : "bg-primary/80",
              ].join(" ")}
            />
          ))}
        </div>
        <span>높음</span>
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
  const hourly = normalizedHourly(snapshot)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.35 }}
        className="rounded-xl border border-border/70 bg-card/70 p-4"
      >
        <h3 className="text-sm font-semibold">일별 커밋 추이</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{trendSubtitle}</p>
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
        <h3 className="text-sm font-semibold">시간대별 커밋 분포</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">KST 기준 · 현재 선택한 기간</p>
        <div className="mt-4">
          <HourlyBarChart data={hourly} />
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

function hourOfKst(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(new Date(iso))
}

function normalizedHourly(snapshot?: AggregatedSnapshot) {
  const counts = new Map(Array.from({ length: 24 }, (_, hour) => [String(hour).padStart(2, "0"), 0]))
  const source = snapshot?.activityFeed ?? []
  for (const item of source) {
    const hour = hourOfKst(item.committedAt)
    counts.set(hour, (counts.get(hour) ?? 0) + 1)
  }
  return [...counts.entries()].map(([hour, commits]) => ({ hour, commits }))
}

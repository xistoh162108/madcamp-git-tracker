"use client"

import { motion } from "framer-motion"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
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

export function DailyLineChart({
  data,
  compact = false,
}: {
  data: { date: string; commits: number }[]
  compact?: boolean
}) {
  return (
    <div className={compact ? "h-32" : "h-48"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 17%)" vertical={false} />
          <XAxis dataKey="date" stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(220 16% 14%)" }} />
          <Bar dataKey="commits" name="커밋 수" fill="hsl(196 90% 54%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function daysForWeek(week: WeekConfig): string[] {
  const days: string[] = []
  const cursor = new Date(week.startAt)
  const endKey = dateKey(new Date(week.endAt))
  while (dateKey(cursor) <= endKey) {
    days.push(dateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function SprintBoard({
  heatmap,
  weeks,
  currentWeek,
}: {
  heatmap: Array<{ date: string; count: number }>
  weeks: WeekConfig[]
  currentWeek: number | null
}) {
  const counts = new Map(heatmap.map((day) => [day.date, day.count]))
  const max = Math.max(1, ...heatmap.map((day) => day.count))
  const today = dateKey(new Date())
  const activeWeeks = weeks.slice(0, 4)
  const weekDayLists = activeWeeks.map((week) => daysForWeek(week))
  const columnCount = Math.max(1, ...weekDayLists.map((days) => days.length))
  const longestWeekDays = weekDayLists.find((days) => days.length === columnCount) ?? []
  const headerLabels = longestWeekDays.map((day) => weekdayLabel(day))
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[44px_1fr] items-center gap-2">
        <span />
        <div className="grid gap-1.5 text-center text-[10px] font-medium text-muted-foreground" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
          {headerLabels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
      {activeWeeks.map((week, weekIndex) => {
        const days = weekDayLists[weekIndex]!.map((key) => {
          const disabled = currentWeek ? week.week > currentWeek : false
          const count = disabled ? 0 : (counts.get(key) ?? 0)
          return { key, label: dayLabel(key), count, level: intensity(count, max), disabled, today: key === today }
        })
        return (
          <div key={week.week} className="grid grid-cols-[44px_1fr] items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{week.label}</span>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
              {days.map((day, index) => (
                <motion.span
                  key={day.key}
                  title={`${weekdayLabel(day.key)} ${day.label} · ${day.disabled ? "예정" : `${day.count} commits`}`}
                  initial={{ opacity: 0, scale: 0.72 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={!day.disabled ? { scale: 1.16, y: -2 } : undefined}
                  transition={{ duration: 0.18, delay: week.week * 0.04 + index * 0.018 }}
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
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
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
    </div>
  )
}

export function MemberBarChart({ data }: { data: { name: string; commits: number }[] }) {
  const longestLabel = Math.max(0, ...data.map((entry) => entry.name.length))
  const axisWidth = Math.min(120, Math.max(56, longestLabel * 7 + 12))
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 17%)" horizontal={false} />
          <XAxis type="number" stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="hsl(216 12% 58%)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={axisWidth}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(220 16% 14%)" }} />
          <Bar dataKey="commits" name="커밋 수" fill="hsl(196 90% 54%)" radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function HourlyBarChart({
  data,
  name = "커밋 수",
}: {
  data: { hour: string; commits: number }[]
  name?: string
}) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 17%)" vertical={false} />
          <XAxis dataKey="hour" stroke="hsl(216 12% 58%)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(216 12% 58%)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(220 16% 14%)" }} />
          <Bar dataKey="commits" name={name} fill="hsl(264 70% 64%)" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

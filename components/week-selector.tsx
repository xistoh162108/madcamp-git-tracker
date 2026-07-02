"use client"

import { config, weeks } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { WeekConfig } from "@/src/config/schema"

function fmt(iso: string) {
  // 2026-07-09T09:00:00+09:00 -> 07.09 09:00
  const m = iso.match(/\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return ""
  return `${m[1]}.${m[2]} ${m[3]}:${m[4]}`
}

export function WeekSelector({
  configuredWeeks,
  currentWeek,
  selectedKey,
  onSelect,
}: {
  configuredWeeks?: WeekConfig[]
  currentWeek?: number | null
  selectedKey?: string
  onSelect?: (key: string) => void
}) {
  const activeCurrentWeek = currentWeek ?? config.currentWeek
  const selected = selectedKey ?? (activeCurrentWeek ? `w${activeCurrentWeek}` : "all")
  const sourceWeeks =
    configuredWeeks?.map((week) => ({
      ...week,
      status:
        activeCurrentWeek === week.week
          ? ("active" as const)
          : activeCurrentWeek && week.week < activeCurrentWeek
            ? ("ended" as const)
            : ("upcoming" as const),
    })) ?? weeks

  const options = [
    { key: "all", label: "전체", range: "", active: false },
    ...sourceWeeks
      .filter((w) => w.enabled)
      .filter((w) => w.status !== "upcoming")
      .map((w) => ({
        key: `w${w.week}`,
        label: w.label,
        range: `${fmt(w.startAt)} ~ ${fmt(w.endAt)}`,
        active: w.status === "active",
      })),
  ]

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">기간</span>
      <div className="inline-flex shrink-0 rounded-lg border border-border/70 bg-muted/30 p-0.5">
        {options.map((o) => {
          const isSelected = selected === o.key
          return (
            <button
              key={o.key}
              onClick={() => onSelect?.(o.key)}
              title={o.range || o.label}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                isSelected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
              {o.active && <span className="h-1.5 w-1.5 rounded-full bg-positive" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { config, weeks } from "@/lib/data"
import { cn } from "@/lib/utils"

function fmt(iso: string) {
  // 2026-07-09T09:00:00+09:00 -> 07.09 09:00
  const m = iso.match(/\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return ""
  return `${m[1]}.${m[2]} ${m[3]}:${m[4]}`
}

export function WeekSelector() {
  const [selected, setSelected] = useState<string>(`w${config.currentWeek}`)

  const options = [
    { key: "all", label: "전체 기간", range: "", active: false },
    ...weeks
      .filter((w) => w.enabled)
      .map((w) => ({
        key: `w${w.week}`,
        label: w.label,
        range: `${fmt(w.startAt)} ~ ${fmt(w.endAt)}`,
        active: w.status === "active",
      })),
  ]

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {options.map((o) => {
        const isSelected = selected === o.key
        return (
          <button
            key={o.key}
            onClick={() => setSelected(o.key)}
            className={cn(
              "flex shrink-0 flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-colors",
              isSelected
                ? "border-primary/60 bg-primary/10"
                : "border-border/70 bg-card/50 hover:border-border",
            )}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              {o.label}
              {o.active && (
                <span className="flex items-center gap-1 rounded-full bg-positive/15 px-1.5 text-[9px] font-medium text-positive">
                  <span className="h-1 w-1 rounded-full bg-positive" />
                  진행 중
                </span>
              )}
            </span>
            {o.range && <span className="font-mono text-[10px] text-muted-foreground tabular">{o.range}</span>}
          </button>
        )
      })}
    </div>
  )
}

"use client"

import { motion } from "framer-motion"
import { GitCommitHorizontal, TrendingUp } from "lucide-react"
import { dailyHighlights, config } from "@/lib/data"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"

export function DailyHighlights({ snapshot }: { snapshot?: AggregatedSnapshot }) {
  if (!config.showDailyHighlights) return null
  const todayCommits = snapshot?.heatmap.at(-1)?.count ?? dailyHighlights.todayCommits
  const recentCommits =
    snapshot?.heatmap.slice(-2).reduce((sum, day) => sum + day.count, 0) ?? dailyHighlights.newCommitsSinceSync
  const topMover = snapshot?.rankings.personal[0]?.label ?? dailyHighlights.topMoverToday

  const items = [
    {
      icon: GitCommitHorizontal,
      label: "오늘 커밋",
      value: `${todayCommits}개`,
      hint: `최근 ${config.dailyWindowHours}시간 기준`,
      accent: "text-primary",
    },
    {
      icon: TrendingUp,
      label: "현재 1위",
      value: topMover,
      hint: snapshot?.rankings.personal[0] ? `${snapshot.rankings.personal[0].commits} commits` : "랭킹 집계 대기",
      accent: "text-positive",
    },
    {
      icon: GitCommitHorizontal,
      label: "최근 반영",
      value: `${recentCommits}개`,
      hint: `마지막 업데이트 ${snapshot?.generatedAtKst ?? "-"}`,
      accent: "text-accent",
    },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.12 }}
      className="rounded-xl border border-border/70 bg-card/70 p-4"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <TrendingUp className="h-4 w-4 text-positive" />
        {config.dailyHighlightsLabel}
        <span className="ml-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          최근 {config.dailyWindowHours}시간
        </span>
      </h3>
      <ul className="mt-3 grid gap-2">
        {items.map((it, index) => (
          <motion.li
            key={it.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 + index * 0.06 }}
            whileHover={{ x: 3, scale: 1.015 }}
            className="rounded-lg border border-border/60 bg-background/40 p-2.5"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <it.icon className={`h-3.5 w-3.5 ${it.accent}`} />
              {it.label}
            </div>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="text-sm font-semibold">{it.value}</p>
              <span className="rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                live
              </span>
            </div>
            <p className="mt-1 truncate text-[10px] text-muted-foreground">{it.hint}</p>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  )
}

"use client"

import { motion } from "framer-motion"
import { BarChart3, CalendarDays, FolderGit2, Trophy, Users } from "lucide-react"
import { CountUp } from "@/components/count-up"
import { summary } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"

interface Metric {
  label: string
  value?: number
  text?: string
  subtext?: string
  members?: string
  suffix?: string
  icon: React.ElementType
  accent?: string
}

export function MetricCards({ snapshot }: { snapshot?: AggregatedSnapshot }) {
  // "가장 활발한 팀" is intentionally selected by raw total commits, independent of the
  // score-based team ranking -- this card answers "who's generating the most activity",
  // not "who's ranked #1".
  const mostActiveTeamEntry = snapshot
    ? [...snapshot.rankings.teams].sort((a, b) => b.commits - a.commits)[0]
    : undefined
  const topTeam = mostActiveTeamEntry?.label.replace(/^.*?(w\d+-c\d+-\d+)$/, "$1") ?? summary.topTeam
  const topTeamMeta = mostActiveTeamEntry?.meta
  const topTeamMembers =
    mostActiveTeamEntry && snapshot
      ? [
          ...new Set(
            snapshot.activityFeed
              .filter((item) => item.repoName === mostActiveTeamEntry.label)
              .map((item) => item.label),
          ),
        ]
          .slice(0, 4)
          .join(", ")
      : undefined
  const topTeamStats = mostActiveTeamEntry
    ? `${mostActiveTeamEntry.commits} commits · ${(mostActiveTeamEntry.score ?? 0).toFixed(1)}점`
    : undefined
  const topClass = snapshot?.rankings.classes[0]?.label ?? summary.topClass
  const totalCommits = snapshot?.summary.totalCommits ?? summary.totalCommits
  const weekCommits = totalCommits
  const activeRepos = snapshot?.summary.activeRepos ?? summary.activeRepos
  const activeParticipants = snapshot?.summary.activeParticipants ?? summary.participants
  const totalRepos = snapshot?.sync?.reposScanned
  const totalParticipants = snapshot?.summary.participants
  const allCommits = totalCommits
  const averagePerPerson =
    snapshot && snapshot.summary.activeParticipants > 0
      ? Number((snapshot.summary.mappedCommits / snapshot.summary.activeParticipants).toFixed(1))
      : 0
  const totalQualifiedCommits =
    snapshot?.rankings.personal.reduce((sum, entry) => sum + (entry.qualifiedCommits ?? 0), 0) ?? 0
  const totalPersonalCommits = snapshot?.rankings.personal.reduce((sum, entry) => sum + entry.commits, 0) ?? 0
  const qualifiedRate =
    totalPersonalCommits > 0 ? Math.round((totalQualifiedCommits / totalPersonalCommits) * 100) : null

  const metrics: Metric[] = [
    {
      label: "이번 주 커밋",
      value: weekCommits,
      icon: CalendarDays,
      accent: "text-primary",
    },
    {
      label: "활성 repo",
      value: activeRepos,
      suffix: totalRepos ? `/${totalRepos}개 (${Math.round((activeRepos / totalRepos) * 100)}%)` : "개",
      icon: FolderGit2,
      accent: "text-foreground",
    },
    {
      label: "커밋한 참가자",
      value: activeParticipants,
      suffix: totalParticipants ? `/${totalParticipants}명` : "명",
      icon: Users,
      accent: "text-foreground",
    },
    {
      label: "가장 활발한 팀",
      text: topTeam,
      subtext: topTeamMeta,
      members: topTeamMembers ? `${topTeamMembers}${topTeamStats ? ` · ${topTeamStats}` : ""}` : topTeamStats,
      icon: Trophy,
      accent: "text-gold",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((m, index) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -3, scale: 1.015 }}
          whileTap={{ scale: 0.99 }}
          className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/70 p-3.5 transition-colors hover:border-primary/35"
        >
          <motion.div
            className="absolute inset-x-0 top-0 h-px bg-primary/70"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.55, delay: 0.15 + index * 0.08 }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{m.label}</span>
            <motion.span whileHover={{ rotate: -8, scale: 1.1 }} transition={{ type: "spring", stiffness: 420 }}>
              <m.icon className={cn("h-4 w-4", m.accent)} />
            </motion.span>
          </div>
          <div className="mt-2 flex min-w-0 flex-col text-2xl font-bold tracking-tight tabular sm:flex-row sm:items-baseline sm:gap-1.5">
            {m.value !== undefined ? (
              <CountUp value={m.value} suffix={m.suffix} />
            ) : (
              <>
                <span className="min-w-0 truncate font-mono text-xl">{m.text}</span>
                {m.subtext ? (
                  <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{m.subtext}</span>
                ) : null}
              </>
            )}
          </div>
          {m.members ? (
            <p className="mt-1 truncate text-[10px] font-normal text-muted-foreground">{m.members}</p>
          ) : null}
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.28 }}
        className="col-span-2 rounded-xl border border-border/60 bg-card/45 px-3.5 py-2.5 text-xs text-muted-foreground lg:col-span-4"
      >
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            이번 주 <span className="font-semibold text-foreground tabular">{allCommits.toLocaleString()}</span> commits
          </span>
          <span className="text-border">·</span>
          <span>
            커밋한 참가자{" "}
            <span className="font-semibold text-foreground tabular">{activeParticipants.toLocaleString()}명</span>
          </span>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5 text-positive" /> 인당 평균 {averagePerPerson}
          </span>
          {qualifiedRate !== null ? (
            <>
              <span className="text-border">·</span>
              <span
                className="cursor-help underline decoration-dotted underline-offset-2"
                title="좋은 커밋: 적절한 변경량과 명확한 메시지를 가진 커밋 비율입니다. merge·revert·의존성 업데이트·포맷팅 커밋은 낮은 가중치로 반영됩니다."
              >
                좋은 커밋 비율 <span className="font-semibold text-foreground tabular">{qualifiedRate}%</span> ⓘ
              </span>
            </>
          ) : null}
          <span className="text-border">·</span>
          <span>
            <span className="font-semibold text-foreground">{topClass}</span> 선두
          </span>
        </p>
      </motion.div>
    </div>
  )
}

"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Bot, ExternalLink, GitCommitHorizontal, GitMerge, Users } from "lucide-react"
import { feed } from "@/lib/data"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"

interface CommitFeedItem {
  id: string
  actor: string
  repo: string
  message: string
  committedAt: string
  href?: string
  attributionStatus?: AggregatedSnapshot["activityFeed"][number]["attributionStatus"]
  detectedBots?: string[]
  additions?: number
  deletions?: number
  changedFiles?: number
}

interface FeedGroup {
  id: string
  actor: string
  repo: string
  startedAt: string
  endedAt: string
  items: CommitFeedItem[]
  additions?: number
  deletions?: number
  changedFiles?: number
  attributionStatus?: CommitFeedItem["attributionStatus"]
  detectedBots: string[]
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function feedItems(snapshot?: AggregatedSnapshot): CommitFeedItem[] {
  if (snapshot) {
    return snapshot.activityFeed.slice(0, 20).map((item) => ({
      id: item.id,
      actor: item.label,
      repo: item.repoName.replace(/^.*?(w\d+-c\d+-\d+)$/, "$1"),
      message: item.summary,
      committedAt: item.committedAt,
      href: item.commitUrl,
      attributionStatus: item.attributionStatus,
      detectedBots: item.detectedBots,
      additions: item.additions,
      deletions: item.deletions,
      changedFiles: item.changedFiles,
    }))
  }
  return feed.slice(0, 10).map((item) => ({
    id: String(item.id),
    actor: item.text.split("님")[0] ?? "player",
    repo: item.text.match(/w\d+-c\d+-\d+/)?.[0] ?? "camp",
    message: item.text.replace(/^.*?·\s*/, ""),
    committedAt: new Date().toISOString(),
  }))
}

function groupFeed(items: CommitFeedItem[]): FeedGroup[] {
  const groups: FeedGroup[] = []
  for (const item of items) {
    const latest = groups.at(-1)
    const closeEnough = latest
      ? Math.abs(Date.parse(latest.endedAt) - Date.parse(item.committedAt)) <= 30 * 60 * 1000
      : false
    if (latest && latest.actor === item.actor && latest.repo === item.repo && closeEnough) {
      latest.items.push(item)
      latest.startedAt = item.committedAt < latest.startedAt ? item.committedAt : latest.startedAt
      latest.endedAt = item.committedAt > latest.endedAt ? item.committedAt : latest.endedAt
      latest.additions = sumOptional(latest.additions, item.additions)
      latest.deletions = sumOptional(latest.deletions, item.deletions)
      latest.changedFiles = sumOptional(latest.changedFiles, item.changedFiles)
      latest.detectedBots = [...new Set([...latest.detectedBots, ...(item.detectedBots ?? [])])]
      latest.attributionStatus = latest.attributionStatus ?? item.attributionStatus
      continue
    }
    groups.push({
      id: item.id,
      actor: item.actor,
      repo: item.repo,
      startedAt: item.committedAt,
      endedAt: item.committedAt,
      items: [item],
      additions: item.additions,
      deletions: item.deletions,
      changedFiles: item.changedFiles,
      attributionStatus: item.attributionStatus,
      detectedBots: item.detectedBots ?? [],
    })
  }
  return groups.slice(0, 12)
}

function sumOptional(a?: number, b?: number) {
  if (a === undefined && b === undefined) return undefined
  return (a ?? 0) + (b ?? 0)
}

function kindForGroup(group: FeedGroup) {
  const message = group.items[0]?.message.toLowerCase() ?? ""
  if (group.attributionStatus === "unknown") return { label: "기타", icon: AlertTriangle, cls: "text-destructive" }
  if (group.attributionStatus === "bot_only" || group.detectedBots.length > 0) {
    return { label: "자동화", icon: Bot, cls: "text-accent" }
  }
  if (group.attributionStatus === "multiple_participants" || group.attributionStatus === "bot_with_participant") {
    return { label: "공동", icon: Users, cls: "text-positive" }
  }
  if (message.startsWith("merge ")) return { label: "병합", icon: GitMerge, cls: "text-gold" }
  return { label: "commit", icon: GitCommitHorizontal, cls: "text-primary" }
}

function StatsLine({ group }: { group: FeedGroup }) {
  const hasStats = group.additions !== undefined || group.deletions !== undefined || group.changedFiles !== undefined
  if (!hasStats) {
    return (
      <span className="text-[10px] text-muted-foreground">
        {group.items.length === 1 ? "1 commit" : `${group.items.length} commits grouped`}
      </span>
    )
  }
  return (
    <span className="flex flex-wrap gap-1.5 text-[10px]">
      {group.items.length > 1 ? <span className="text-muted-foreground">{group.items.length} commits</span> : null}
      {group.additions !== undefined ? <span className="text-positive">+{group.additions}</span> : null}
      {group.deletions !== undefined ? <span className="text-destructive">-{group.deletions}</span> : null}
      {group.changedFiles !== undefined ? (
        <span className="text-muted-foreground">{group.changedFiles} files changed</span>
      ) : null}
    </span>
  )
}

export function ActivityFeed({ snapshot }: { snapshot?: AggregatedSnapshot }) {
  const groups = groupFeed(feedItems(snapshot))

  return (
    <motion.section
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-xl border border-border/70 bg-card/70"
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <GitCommitHorizontal className="h-4 w-4 text-primary" />
          최근 커밋
        </h3>
        <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          최근 {groups.reduce((sum, group) => sum + group.items.length, 0)} commits
        </span>
      </div>
      <ol className="mt-3 max-h-[420px] overflow-y-auto px-4 pb-4 pr-2">
        {groups.map((group, index) => {
          const kind = kindForGroup(group)
          const Icon = kind.icon
          const primary = group.items[0]
          const message = primary?.message ?? "commit"
          const kindLabel = group.items.length > 1 ? "묶음" : kind.label
          const time =
            group.items.length > 1
              ? `${formatTime(group.startedAt)}-${formatTime(group.endedAt)}`
              : formatTime(group.endedAt)
          return (
            <motion.li
              key={group.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: index * 0.035 }}
              whileHover={{ x: -2 }}
              className="group relative border-l border-border/70 py-2.5 pl-3 transition-colors hover:border-primary/50"
            >
              <span className="absolute -left-[5px] top-4 h-2.5 w-2.5 rounded-full border border-background bg-primary" />
              <div className="flex min-w-0 items-start gap-2">
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${kind.cls}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="rounded border border-border/70 bg-background/50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                      {kindLabel}
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground">{group.actor}</span>
                    <span className="text-[10px] text-border">·</span>
                    <span className="truncate font-mono text-xs text-primary">{group.repo}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{time}</span>
                  </div>
                  {primary?.href ? (
                    <a
                      href={primary.href}
                      target="_blank"
                      rel="noreferrer"
                      title="GitHub에서 커밋 보기"
                      className="group/link mt-1 flex max-w-full items-center gap-1 text-xs text-foreground/90 underline-offset-2 hover:text-primary hover:underline"
                    >
                      <span className="truncate whitespace-nowrap">{message}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
                    </a>
                  ) : (
                    <p className="mt-1 max-w-full truncate whitespace-nowrap text-xs text-foreground/90">{message}</p>
                  )}
                  {group.items.length > 1 ? (
                    <ul className="mt-1 space-y-0.5">
                      {group.items.slice(1, 3).map((item) =>
                        item.href ? (
                          <li key={item.id} className="max-w-full">
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              title="GitHub에서 커밋 보기"
                              className="block max-w-full truncate whitespace-nowrap text-[11px] text-muted-foreground hover:text-primary hover:underline"
                            >
                              {item.message}
                            </a>
                          </li>
                        ) : (
                          <li
                            key={item.id}
                            className="max-w-full truncate whitespace-nowrap text-[11px] text-muted-foreground"
                          >
                            {item.message}
                          </li>
                        ),
                      )}
                    </ul>
                  ) : null}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <StatsLine group={group} />
                    {group.items.length > 1 ? (
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        묶음
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </motion.section>
  )
}

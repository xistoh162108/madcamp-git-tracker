"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RankMedal } from "@/components/rank-medal"
import { RankChange } from "@/components/rank-change"
import { InitialsAvatar } from "@/components/initials-avatar"
import { Podium, type PodiumEntry } from "@/components/podium"
import { Notice } from "@/components/notice"
import { WeekSelector } from "@/components/week-selector"
import {
  individuals,
  teams,
  classes,
  config,
  classNoticeText,
  repoNoticeText,
  fmtRepoShort,
} from "@/lib/data"
import { cn } from "@/lib/utils"

type RankType = "individual" | "team" | "class"
type ClassMetric = "averagePerPerson" | "total"

export function LeaderboardSection() {
  const [type, setType] = useState<RankType>("individual")
  const [classFilter, setClassFilter] = useState<string>("all")
  const [sort, setSort] = useState<string>("commits")
  const [classMetric, setClassMetric] = useState<ClassMetric>(config.defaultClassRankingMetric)

  const filteredIndividuals = useMemo(
    () => individuals.filter((i) => classFilter === "all" || i.class === classFilter),
    [classFilter],
  )
  const filteredTeams = useMemo(
    () => teams.filter((t) => classFilter === "all" || t.class === classFilter),
    [classFilter],
  )

  const sortedClasses = useMemo(() => {
    const arr = [...classes]
    if (classMetric === "averagePerPerson") {
      arr.sort((a, b) => b.totalCommits / b.participants - a.totalCommits / a.participants)
    } else {
      arr.sort((a, b) => b.totalCommits - a.totalCommits)
    }
    return arr.map((c, i) => ({ ...c, rank: i + 1 }))
  }, [classMetric])

  const podiumEntries: PodiumEntry[] = useMemo(() => {
    if (type === "individual") {
      return filteredIndividuals.slice(0, 3).map((i) => ({
        rank: i.rank,
        title: i.name,
        subtitle: `@${i.username} · ${i.class}`,
        value: i.commits.toLocaleString(),
        valueLabel: "커밋",
        href: `/participant/${i.username}`,
      }))
    }
    if (type === "team") {
      return filteredTeams.slice(0, 3).map((t) => ({
        rank: t.rank,
        title: fmtRepoShort(t.repo),
        subtitle: `${t.class} · ${t.members.length}명`,
        value: t.commits.toLocaleString(),
        valueLabel: "총 커밋",
        href: `/team/${fmtRepoShort(t.repo)}`,
        mono: true,
      }))
    }
    return sortedClasses.slice(0, 3).map((c) => ({
      rank: c.rank,
      title: c.className,
      subtitle: `${c.participants}명 · repo ${c.activeRepos}개`,
      value:
        classMetric === "averagePerPerson"
          ? (c.totalCommits / c.participants).toFixed(1)
          : c.totalCommits.toLocaleString(),
      valueLabel: classMetric === "averagePerPerson" ? "인당 평균" : "총 커밋",
    }))
  }, [type, filteredIndividuals, filteredTeams, sortedClasses, classMetric])

  return (
    <section className="rounded-2xl border border-border/70 bg-card/40 p-3 sm:p-4">
      {/* Tabs + filters */}
      <div className="flex flex-col gap-3">
        <Tabs value={type} onValueChange={(v) => setType(v as RankType)}>
          <TabsList className="h-9 bg-muted/50">
            <TabsTrigger value="individual" className="text-xs data-[state=active]:bg-background">
              개인 랭킹
            </TabsTrigger>
            <TabsTrigger value="team" className="text-xs data-[state=active]:bg-background">
              팀 랭킹
            </TabsTrigger>
            <TabsTrigger value="class" className="text-xs data-[state=active]:bg-background">
              분반 랭킹
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <WeekSelector />

        <div className="flex flex-wrap items-center gap-2">
          {type !== "class" && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="분반" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분반</SelectItem>
                {config.classes.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="commits">커밋 수</SelectItem>
              <SelectItem value="recent">최근 활동</SelectItem>
              <SelectItem value="rankup">순위 상승</SelectItem>
            </SelectContent>
          </Select>

          {type === "class" && (
            <div className="ml-auto inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                onClick={() => setClassMetric("averagePerPerson")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  classMetric === "averagePerPerson" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                인당 평균
              </button>
              <button
                onClick={() => setClassMetric("total")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  classMetric === "total" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                총합
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top 3 */}
      <div className="mt-4">
        <Podium entries={podiumEntries} />
      </div>

      {/* Rows */}
      <div className="mt-4 space-y-1.5">
        {type === "individual" && <IndividualRows data={filteredIndividuals} />}
        {type === "team" && <TeamRows data={filteredTeams} />}
        {type === "class" && <ClassRows data={sortedClasses} metric={classMetric} />}
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        {type === "class" ? <Notice>{classNoticeText}</Notice> : <Notice>{repoNoticeText}</Notice>}
      </div>
    </section>
  )
}

function RowShell({ children, href }: { children: React.ReactNode; href?: string }) {
  const base =
    "group flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-card"
  return href ? (
    <Link href={href} className={base}>
      {children}
    </Link>
  ) : (
    <div className={base}>{children}</div>
  )
}

function IndividualRows({ data }: { data: typeof individuals }) {
  return (
    <>
      {data.map((i) => (
        <RowShell key={i.username} href={`/participant/${i.username}`}>
          <RankMedal rank={i.rank} />
          <InitialsAvatar name={i.name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{i.name}</span>
              <span className="truncate font-mono text-xs text-muted-foreground">@{i.username}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{i.class}</span>
              <span className="text-border">·</span>
              <span className="font-mono">{i.team}</span>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs text-muted-foreground">활동 {i.activeDays}일</p>
            <p className="text-[11px] text-muted-foreground">{i.lastActivity}</p>
          </div>
          <div className="w-16 text-right">
            <p className="text-base font-bold tabular">{i.commits}</p>
            <p className="text-[10px] text-muted-foreground">커밋</p>
          </div>
          <RankChange rank={i.rank} prevRank={i.prevRank} className="w-8 justify-end" />
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
        </RowShell>
      ))}
    </>
  )
}

function TeamRows({ data }: { data: typeof teams }) {
  return (
    <>
      {data.map((t) => {
        const avg = (t.commits / t.members.length).toFixed(1)
        return (
          <RowShell key={t.repo} href={`/team/${fmtRepoShort(t.repo)}`}>
            <RankMedal rank={t.rank} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-sm font-semibold">{fmtRepoShort(t.repo)}</span>
                <span className="shrink-0 rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {t.class}
                </span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {t.members.join(", ")} · {t.members.length}명
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-xs text-muted-foreground">활동 {t.activeDays}일</p>
              <p className="text-[11px] text-muted-foreground">{t.lastActivity}</p>
            </div>
            <div className="hidden w-16 text-right md:block">
              <p className="text-sm font-semibold tabular text-accent">{avg}</p>
              <p className="text-[10px] text-muted-foreground">인당 평균</p>
            </div>
            <div className="w-16 text-right">
              <p className="text-base font-bold tabular">{t.commits}</p>
              <p className="text-[10px] text-muted-foreground">총 커밋</p>
            </div>
            <RankChange rank={t.rank} prevRank={t.prevRank} className="w-8 justify-end" />
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
          </RowShell>
        )
      })}
    </>
  )
}

function ClassRows({ data, metric }: { data: typeof classes; metric: ClassMetric }) {
  return (
    <>
      {data.map((c) => {
        const avg = (c.totalCommits / c.participants).toFixed(1)
        return (
          <RowShell key={c.className}>
            <RankMedal rank={c.rank} />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold">{c.className}</span>
              <p className="text-[11px] text-muted-foreground">
                참가자 {c.participants}명 · 활성 repo {c.activeRepos}개
              </p>
            </div>
            <div className="w-20 text-right">
              <p className={cn("text-base font-bold tabular", metric === "averagePerPerson" && "text-primary")}>{avg}</p>
              <p className="text-[10px] text-muted-foreground">인당 평균</p>
            </div>
            <div className="w-20 text-right">
              <p className={cn("text-base font-bold tabular", metric === "total" && "text-primary")}>
                {c.totalCommits.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">총 커밋</p>
            </div>
            <RankChange rank={c.rank} prevRank={c.prevRank} className="w-8 justify-end" />
          </RowShell>
        )
      })}
    </>
  )
}

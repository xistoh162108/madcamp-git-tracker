import { z } from "zod"

export const WeekConfigSchema = z.object({
  week: z.number().int().positive(),
  label: z.string().min(1),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  enabled: z.boolean().default(true),
})

export const RepoOverrideSchema = z.object({
  repoName: z.string().min(1),
  week: z.number().int().positive(),
  class: z.number().int().positive(),
  teamNumber: z.string().min(1),
})

export const AppConfigSchema = z
  .object({
    season: z.string().regex(/^\d{4}-(summer|winter)$/),
    displayName: z.string().min(1),
    timezone: z.literal("Asia/Seoul").default("Asia/Seoul"),
    githubOrg: z.string().min(1),
    repoNamePattern: z.string().default("{yy}{semCode}-w{week}-c{class}-{teamNumber}"),
    // Teams that renamed their repo away from the standard pattern (e.g. week 3's custom names
    // like "HCIzone", "spk") aren't discoverable by parseRepoName -- list them explicitly here so
    // discoverTrackedRepos can still attribute them to the right week/class/team.
    repoOverrides: z.array(RepoOverrideSchema).default([]),
    commitScope: z.enum(["default_branch", "all_branches"]).default("all_branches"),
    classCount: z.number().int().positive(),
    currentWeekOverride: z.number().int().positive().optional(),
    weeks: z.array(WeekConfigSchema).min(1),
    ranking: z.object({
      defaultClassMetric: z.enum(["averagePerPerson", "total"]).default("averagePerPerson"),
      showDailyHighlights: z.boolean().default(true),
      dailyWindowHours: z.number().int().positive().default(24),
    }),
  })
  .superRefine((config, ctx) => {
    const seen = new Set<number>()
    const sorted = [...config.weeks].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))

    for (const week of config.weeks) {
      if (seen.has(week.week)) {
        ctx.addIssue({ code: "custom", path: ["weeks"], message: `duplicate week ${week.week}` })
      }
      seen.add(week.week)

      if (Date.parse(week.endAt) <= Date.parse(week.startAt)) {
        ctx.addIssue({ code: "custom", path: ["weeks", week.week, "endAt"], message: "endAt must be after startAt" })
      }
    }

    for (let index = 1; index < sorted.length; index += 1) {
      if (Date.parse(sorted[index]!.startAt) <= Date.parse(sorted[index - 1]!.endAt)) {
        ctx.addIssue({ code: "custom", path: ["weeks"], message: "week periods must not overlap" })
      }
    }
  })

export type AppConfig = z.infer<typeof AppConfigSchema>
export type WeekConfig = z.infer<typeof WeekConfigSchema>
export type RepoOverride = z.infer<typeof RepoOverrideSchema>

export function resolveCurrentWeek(config: AppConfig, now = new Date()): number | null {
  if (config.currentWeekOverride) return config.currentWeekOverride
  const time = now.getTime()
  const week = config.weeks.find((candidate) => {
    if (!candidate.enabled) return false
    return time >= Date.parse(candidate.startAt) && time <= Date.parse(candidate.endAt)
  })
  return week?.week ?? null
}

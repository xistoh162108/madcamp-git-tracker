import type { AppConfig } from "../config/schema"
import { parseRepoName } from "./repo-name-parser"

export interface GitHubRepoSummary {
  id: number
  name: string
  html_url: string
  private: boolean
  default_branch: string
  pushed_at?: string
}

export interface TrackedRepo {
  id: number
  name: string
  url: string
  season: string
  week: number
  class: number
  teamNumber: string
  private: boolean
  defaultBranch: string
  lastPushedAt?: string
}

export interface DiscoveryResult {
  trackedRepos: TrackedRepo[]
  ignoredRepos: string[]
  warnings: string[]
}

export function discoverTrackedRepos(repos: GitHubRepoSummary[], config: AppConfig): DiscoveryResult {
  const enabledWeeks = new Set(config.weeks.filter((week) => week.enabled).map((week) => week.week))
  const trackedRepos: TrackedRepo[] = []
  const ignoredRepos: string[] = []
  const warnings: string[] = []

  const overrides = new Map(config.repoOverrides.map((override) => [override.repoName, override]))

  for (const repo of repos) {
    const override = overrides.get(repo.name)
    const metadata = override
      ? { season: config.season, week: override.week, class: override.class, teamNumber: override.teamNumber }
      : parseRepoName(repo.name, config.season)
    if (!metadata) {
      ignoredRepos.push(repo.name)
      continue
    }
    if (!enabledWeeks.has(metadata.week)) {
      ignoredRepos.push(repo.name)
      warnings.push(`${repo.name}: disabled or unknown week`)
      continue
    }
    if (metadata.class > config.classCount) {
      warnings.push(`${repo.name}: class exceeds configured classCount`)
      continue
    }
    trackedRepos.push({
      id: repo.id,
      name: repo.name,
      url: repo.html_url,
      season: metadata.season,
      week: metadata.week,
      class: metadata.class,
      teamNumber: metadata.teamNumber,
      private: repo.private,
      defaultBranch: repo.default_branch,
      lastPushedAt: repo.pushed_at,
    })
  }

  return { trackedRepos, ignoredRepos, warnings }
}

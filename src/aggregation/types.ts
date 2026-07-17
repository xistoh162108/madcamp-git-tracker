export type CommitKind =
  | "normal"
  | "merge"
  | "squash_merge"
  | "empty"
  | "conflict_resolve"
  | "revert"
  | "dependency_update"
  | "lockfile_only"
  | "formatting"
  | "generated_files"
  | "asset_only"
  | "rename_only"

export interface CommitRecord {
  sha: string
  repoName: string
  sourceBranches?: string[]
  week: number
  class: number
  teamNumber: string
  authorGithubUsername?: string
  authorEmail?: string
  authorName?: string
  committerGithubUsername?: string
  committerEmail?: string
  committerName?: string
  coAuthors?: Array<{ name: string; email: string }>
  detectedBots?: string[]
  matchedParticipants?: Array<{
    participantId: string
    matchSource:
      | "author_login"
      | "author_email"
      | "author_name"
      | "committer_login"
      | "committer_email"
      | "committer_name"
      | "coauthor_email"
  }>
  attributionStatus?: "single_participant" | "multiple_participants" | "bot_with_participant" | "bot_only" | "unknown"
  participantId?: string
  committedAt: string
  messageSummary?: string
  commitUrl?: string
  additions?: number
  deletions?: number
  changedFiles?: number
  commitKind?: CommitKind
  parentCount?: number
  isConventionalMessage?: boolean
  messageLength?: number
  isVagueMessage?: boolean
}

export interface RankedEntry {
  rank: number
  prevRank: number
  isNew: boolean
  id: string
  label: string
  commits: number
  activeDays: number
  lastActivityAt?: string
  meta?: string
  averagePerPerson?: number
  honorTitles?: Array<{ id: string; label: string; desc: string }>
  activityStats?: {
    currentDayStreak: number
    longestDayStreak: number
    currentHourStreak: number
    longestHourStreak: number
    activeHours: number
  }
  score?: number
  qualifiedCommits?: number
  avgChangedLines?: number
  avgChangedFiles?: number
  messageFormatRate?: number
  memberBreakdown?: Array<{
    participantId: string
    label: string
    githubUsername?: string
    qualifiedCommits: number
    score: number
  }>
  hourlyDistribution?: Array<{ hour: string; commits: number }>
  heatmap?: Array<{ date: string; count: number }>
  commitKindBreakdown?: Array<{ kind: string; count: number }>
  weeklyBreakdown?: Array<{ week: number; repoName: string; commits: number }>
  recentCommits?: Array<{
    id: string
    repoName: string
    committedAt: string
    summary: string
    commitUrl?: string
    branches?: string[]
    additions?: number
    deletions?: number
    changedFiles?: number
    commitKind?: CommitKind
    score?: number
  }>
}

export interface UnknownUser {
  repoName: string
  sha: string
  authorLogin?: string
  authorEmail?: string
  authorName?: string
  committedAt: string
  reason: "not_in_participants_csv" | "missing_author" | "bot" | "external"
}

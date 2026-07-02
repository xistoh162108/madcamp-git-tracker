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

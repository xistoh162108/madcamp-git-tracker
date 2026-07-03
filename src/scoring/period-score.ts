import type { CommitRecord } from "../aggregation/types"
import {
  ACTIVE_DAY_THRESHOLD,
  BALANCE_FACTOR_BANDS,
  CONSISTENCY_BONUS_BANDS,
  DAILY_COMMIT_CAP,
  RHYTHM_BONUS_BANDS,
  SMALL_DIFF_PENALTY,
  TEAM_SIZE_EXPONENT,
  VAGUE_MESSAGE_PENALTY,
  lookupMaxBand,
} from "./constants"
import { commitScore, hasLowQualityMessage, isQualifiedCommit } from "./commit-score"

export interface DailyScoreResult {
  score: number
  qualifiedCount: number
}

/** `dayCommitsChronological` must already be sorted ascending by committedAt. */
export function dailyScore(dayCommitsChronological: CommitRecord[]): DailyScoreResult {
  const qualifiedCount = dayCommitsChronological.filter(isQualifiedCommit).length
  const total = dayCommitsChronological.length

  const cappedCommits = dayCommitsChronological.slice(0, DAILY_COMMIT_CAP)
  let sum = cappedCommits.reduce((acc, commit) => acc + commitScore(commit), 0)

  if (total > 0) {
    const smallDiffCount = dayCommitsChronological.filter((c) => {
      const changedLines = (c.additions ?? 0) + (c.deletions ?? 0)
      return changedLines >= 1 && changedLines <= 2
    }).length
    if (smallDiffCount / total >= SMALL_DIFF_PENALTY.threshold) {
      sum *= SMALL_DIFF_PENALTY.multiplier
    }

    const vagueMessageCount = dayCommitsChronological.filter(hasLowQualityMessage).length
    if (vagueMessageCount / total >= VAGUE_MESSAGE_PENALTY.threshold) {
      sum *= VAGUE_MESSAGE_PENALTY.multiplier
    }
  }

  const rhythmBonus = lookupMaxBand(qualifiedCount, RHYTHM_BONUS_BANDS)
  return { score: sum + rhythmBonus, qualifiedCount }
}

export interface WeeklyScoreResult {
  score: number
  activeDayCount: number
}

export function weeklyScore(dailyResults: DailyScoreResult[]): WeeklyScoreResult {
  const activeDayCount = dailyResults.filter((day) => day.score >= ACTIVE_DAY_THRESHOLD).length
  const consistencyBonus = lookupMaxBand(activeDayCount, CONSISTENCY_BONUS_BANDS)
  const score = dailyResults.reduce((acc, day) => acc + day.score, 0) + consistencyBonus
  return { score, activeDayCount }
}

export interface TeamScoreResult {
  score: number
  balanceRatio: number
  balanceFactor: number
}

export function teamScore(
  memberWeeklyScores: number[],
  memberQualifiedCommitCounts: number[],
  teamSize: number,
): TeamScoreResult {
  const rawScore = memberWeeklyScores.reduce((acc, score) => acc + score, 0)
  const normalized = teamSize > 0 ? rawScore / Math.pow(teamSize, TEAM_SIZE_EXPONENT) : rawScore

  const avgQualified =
    memberQualifiedCommitCounts.length > 0
      ? memberQualifiedCommitCounts.reduce((acc, count) => acc + count, 0) / memberQualifiedCommitCounts.length
      : 0
  const minQualified = memberQualifiedCommitCounts.length > 0 ? Math.min(...memberQualifiedCommitCounts) : 0
  const balanceRatio = avgQualified > 0 ? minQualified / avgQualified : 1

  const band =
    BALANCE_FACTOR_BANDS.find((candidate) => balanceRatio >= candidate.min) ??
    BALANCE_FACTOR_BANDS[BALANCE_FACTOR_BANDS.length - 1]!
  const balanceFactor = band.value

  return { score: normalized * balanceFactor, balanceRatio, balanceFactor }
}

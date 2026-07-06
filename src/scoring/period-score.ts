import type { CommitRecord } from "../aggregation/types"
import {
  ACTIVE_DAY_THRESHOLD,
  BALANCE_FACTOR_BANDS,
  CONSISTENCY_BONUS_BANDS,
  RHYTHM_BONUS_BANDS,
  SMALL_DIFF_PENALTY,
  TEAM_SIZE_EXPONENT,
  VAGUE_MESSAGE_PENALTY,
  lookupMaxBand,
  lookupMonotonicMaxBand,
} from "./constants"
import { commitScore, hasLowQualityMessage, isQualifiedCommit } from "./commit-score"

export interface DailyScoreResult {
  score: number
  qualifiedCount: number
  /** Combined small-diff/vague-message penalty multiplier applied to this day's raw commit-score
   *  sum -- exposed so callers can derive each individual commit's true effective contribution
   *  (`commitScore(commit) * penaltyMultiplier`) instead of displaying the pre-penalty raw score. */
  penaltyMultiplier: number
  /** This day's flat rhythm bonus, broken out separately since it isn't attributable to any single
   *  commit -- callers that want "sum of displayed commit scores" to reconcile with the total score
   *  need to surface this (and weeklyScore's consistencyBonus) as its own line, not fold it into
   *  per-commit numbers. */
  rhythmBonus: number
}

/** `dayCommitsChronological` must already be sorted ascending by committedAt. */
export function dailyScore(dayCommitsChronological: CommitRecord[]): DailyScoreResult {
  const qualifiedCount = dayCommitsChronological.filter(isQualifiedCommit).length
  const total = dayCommitsChronological.length

  // No cap on how many of the day's commits count -- genuine high-volume output (a hard crunch day)
  // should be rewarded, not zeroed past an arbitrary cutoff. Spam/salami-slicing is instead deterred
  // by the qualified-commit quality bar plus the small-diff/vague-message ratio penalties below.
  const rawSum = dayCommitsChronological.reduce((acc, commit) => acc + commitScore(commit), 0)
  let penaltyMultiplier = 1

  if (total > 0) {
    const smallDiffCount = dayCommitsChronological.filter((c) => {
      const changedLines = (c.additions ?? 0) + (c.deletions ?? 0)
      return changedLines >= 1 && changedLines <= 2
    }).length
    if (smallDiffCount / total >= SMALL_DIFF_PENALTY.threshold) {
      penaltyMultiplier *= SMALL_DIFF_PENALTY.multiplier
    }

    const vagueMessageCount = dayCommitsChronological.filter(hasLowQualityMessage).length
    if (vagueMessageCount / total >= VAGUE_MESSAGE_PENALTY.threshold) {
      penaltyMultiplier *= VAGUE_MESSAGE_PENALTY.multiplier
    }
  }

  // Monotonic on purpose -- see lookupMonotonicMaxBand's doc comment: going past the 7-10 sweet
  // spot no longer earns more bonus, but it must never earn less than the sweet spot already did.
  const rhythmBonus = lookupMonotonicMaxBand(qualifiedCount, RHYTHM_BONUS_BANDS)
  return { score: rawSum * penaltyMultiplier + rhythmBonus, qualifiedCount, penaltyMultiplier, rhythmBonus }
}

export interface WeeklyScoreResult {
  score: number
  activeDayCount: number
  consistencyBonus: number
}

export function weeklyScore(dailyResults: DailyScoreResult[]): WeeklyScoreResult {
  const activeDayCount = dailyResults.filter((day) => day.score >= ACTIVE_DAY_THRESHOLD).length
  const consistencyBonus = lookupMaxBand(activeDayCount, CONSISTENCY_BONUS_BANDS)
  const score = dailyResults.reduce((acc, day) => acc + day.score, 0) + consistencyBonus
  return { score, activeDayCount, consistencyBonus }
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

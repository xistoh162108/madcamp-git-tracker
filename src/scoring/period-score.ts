import type { CommitRecord } from "../aggregation/types"
import {
  ACTIVE_DAY_THRESHOLD,
  BALANCE_FACTOR_BANDS,
  CONSISTENCY_BONUS_BANDS,
  DAILY_FULL_CREDIT_THRESHOLD,
  DAILY_VOLUME_DECAY_RATE,
  RHYTHM_BONUS_BANDS,
  SMALL_DIFF_PENALTY,
  TEAM_SIZE_EXPONENT,
  VAGUE_MESSAGE_PENALTY,
  lookupMaxBand,
  lookupMonotonicMaxBand,
} from "./constants"
import { commitScore, hasLowQualityMessage, isQualifiedCommit } from "./commit-score"

/** How much of a single commit's score counts toward its day's sum, based on its chronological
 *  position (0-indexed) among that day's commits -- see DAILY_FULL_CREDIT_THRESHOLD/
 *  DAILY_VOLUME_DECAY_RATE's doc comment for why this curve exists. */
export function dailyVolumeWeight(chronologicalIndex: number): number {
  if (chronologicalIndex < DAILY_FULL_CREDIT_THRESHOLD) return 1
  return Math.pow(DAILY_VOLUME_DECAY_RATE, chronologicalIndex - DAILY_FULL_CREDIT_THRESHOLD + 1)
}

export interface DailyScoreResult {
  score: number
  qualifiedCount: number
  /** Combined small-diff/vague-message penalty multiplier applied to this day's raw commit-score
   *  sum -- exposed so callers can derive each individual commit's true effective contribution
   *  (`commitScore(commit) * dailyVolumeWeight(index) * penaltyMultiplier`) instead of displaying
   *  the pre-penalty raw score. */
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

  // Every commit still contributes something -- no commit is ever zeroed outright -- but past the
  // "full credit" threshold each additional commit that day counts for gradually less, so genuine
  // high-volume days are rewarded without letting raw commit *count* (as opposed to actual line/file
  // volume) become the dominant lever for score, i.e. splitting the same work into ever more, ever
  // smaller commits stops paying off. Quality-based spam is separately deterred by the qualified-
  // commit bar and the small-diff/vague-message ratio penalties below.
  const rawSum = dayCommitsChronological.reduce(
    (acc, commit, index) => acc + commitScore(commit) * dailyVolumeWeight(index),
    0,
  )
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

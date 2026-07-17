import type { CommitRecord } from "../aggregation/types"
import {
  BALANCE_FACTOR_BANDS,
  DAILY_COMPRESSION_BRACKETS,
  FRAGMENT_MEDIAN_INTERVAL_MINUTES,
  FRAGMENT_PENALTY_BY_WARNING_COUNT,
  FRAGMENT_TINY_RATIO_THRESHOLD,
  FRAGMENT_VAGUE_OR_REPEAT_RATIO_THRESHOLD,
  TEAM_SIZE_EXPONENT,
} from "./constants"
import { commitScore, hasLowQualityMessage, isQualifiedCommit } from "./commit-score"

/** Compresses a day's raw commit-score sum by diminishing marginal brackets (see
 *  DAILY_COMPRESSION_BRACKETS) -- the day's *total* has diminishing returns, not any individual
 *  commit. A normal commit is never penalized for merely being the day's 11th. */
export function compressDailyRaw(rawSum: number): number {
  let compressed = 0
  let previousMax = 0
  for (const bracket of DAILY_COMPRESSION_BRACKETS) {
    if (rawSum <= previousMax) break
    const spanInBracket = Math.min(rawSum, bracket.max) - previousMax
    compressed += spanInBracket * bracket.rate
    previousMax = bracket.max
  }
  return compressed
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

export interface FragmentationPenaltyResult {
  multiplier: number
  warnings: number
}

/**
 * Three file-path-free signals over one day's commits (`dayCommitsChronological` must already be
 * sorted ascending by committedAt): tiny-diff ratio, vague-or-repeated-message ratio, and median
 * gap between consecutive commits. Each crossing its threshold counts as one warning; the combined
 * multiplier only kicks in at 2+ warnings so a single borderline signal alone never docks a day.
 */
export function fragmentationPenalty(dayCommitsChronological: CommitRecord[]): FragmentationPenaltyResult {
  const total = dayCommitsChronological.length
  if (total === 0) return { multiplier: 1.0, warnings: 0 }

  const tinyCount = dayCommitsChronological.filter((c) => {
    const changedLines = (c.additions ?? 0) + (c.deletions ?? 0)
    return changedLines >= 1 && changedLines <= 2
  }).length
  const tinyWarning = tinyCount / total >= FRAGMENT_TINY_RATIO_THRESHOLD

  // Only commits with an actual recorded message participate in repeat-detection -- without a
  // messageSummary, every such commit would collide on the same "" key and falsely count as
  // duplicates of each other.
  const messageCounts = new Map<string, number>()
  for (const commit of dayCommitsChronological) {
    const key = commit.messageSummary?.trim().toLowerCase()
    if (!key) continue
    messageCounts.set(key, (messageCounts.get(key) ?? 0) + 1)
  }
  const vagueOrRepeatCount = dayCommitsChronological.filter((commit) => {
    const key = commit.messageSummary?.trim().toLowerCase()
    return hasLowQualityMessage(commit) || (key !== undefined && (messageCounts.get(key) ?? 0) >= 2)
  }).length
  const vagueOrRepeatWarning = vagueOrRepeatCount / total >= FRAGMENT_VAGUE_OR_REPEAT_RATIO_THRESHOLD

  const gapsMinutes: number[] = []
  for (let i = 1; i < dayCommitsChronological.length; i += 1) {
    const gapMs = Date.parse(dayCommitsChronological[i]!.committedAt) - Date.parse(dayCommitsChronological[i - 1]!.committedAt)
    gapsMinutes.push(gapMs / 60000)
  }
  const medianGap = median(gapsMinutes)
  const intervalWarning = medianGap !== undefined && medianGap <= FRAGMENT_MEDIAN_INTERVAL_MINUTES

  const warnings = [tinyWarning, vagueOrRepeatWarning, intervalWarning].filter(Boolean).length
  const multiplier = FRAGMENT_PENALTY_BY_WARNING_COUNT[warnings] ?? 1.0
  return { multiplier, warnings }
}

export interface DailyScoreResult {
  score: number
  qualifiedCount: number
  /** Uniform per-commit multiplier for this day (`score / rawSum`, or 0 if rawSum is 0) -- since
   *  compression and the fragmentation penalty are both day-level scalars, applying this same
   *  ratio to every commit's own `commitScore()` keeps "sum of displayed per-commit scores ==
   *  this day's score" exact, not approximate. */
  effectiveMultiplier: number
}

/**
 * `dayCommitsChronological` must already be sorted ascending by committedAt.
 *
 * No post-hoc bonus term added here (no "rhythm bonus," no flat per-day add-on): every point in
 * the returned score traces back to `commitScore(commit) * effectiveMultiplier` for some actual
 * commit in the list. The incentive a rhythm bonus would have provided -- reward spreading work
 * across several commits rather than one dump -- already falls out of this for free: multiple real
 * commits simply sum to more raw score than one commit covering the same total content.
 */
export function dailyScore(dayCommitsChronological: CommitRecord[]): DailyScoreResult {
  const qualifiedCount = dayCommitsChronological.filter(isQualifiedCommit).length
  const rawSum = dayCommitsChronological.reduce((acc, commit) => acc + commitScore(commit), 0)
  const compressed = compressDailyRaw(rawSum)
  const { multiplier: penaltyMultiplier } = fragmentationPenalty(dayCommitsChronological)
  const score = compressed * penaltyMultiplier
  const effectiveMultiplier = rawSum > 0 ? score / rawSum : 0
  return { score, qualifiedCount, effectiveMultiplier }
}

export interface WeeklyScoreResult {
  score: number
}

/**
 * Plain sum of the week's daily scores -- no consistency bonus. Spreading real activity across
 * more days already yields more score than cramming it into one (each day's own volume-decay curve
 * only discounts *that* day's excess, so more days of moderate activity beats one huge day), so the
 * incentive a flat consistency bonus would add is already present without a separate add-on.
 */
export function weeklyScore(dailyResults: DailyScoreResult[]): WeeklyScoreResult {
  return { score: dailyResults.reduce((acc, day) => acc + day.score, 0) }
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

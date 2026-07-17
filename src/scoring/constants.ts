import type { CommitKind } from "../aggregation/types"

export interface MaxBand {
  max: number
  value: number
}

/** First band whose `max` is >= value wins (bands must be sorted ascending by `max`). */
export function lookupMaxBand(value: number, bands: MaxBand[]): number {
  for (const band of bands) {
    if (value <= band.max) return band.value
  }
  return bands[bands.length - 1]!.value
}

export const SIZE_BANDS: MaxBand[] = [
  { max: 0, value: 0.0 },
  { max: 2, value: 0.2 },
  { max: 9, value: 0.6 },
  { max: 300, value: 1.0 },
  { max: 800, value: 0.8 },
  { max: 1500, value: 0.4 },
  { max: Infinity, value: 0.15 },
]

export const FILE_BANDS: MaxBand[] = [
  { max: 0, value: 0.0 },
  { max: 8, value: 1.0 },
  { max: 15, value: 0.8 },
  { max: 30, value: 0.4 },
  { max: Infinity, value: 0.15 },
]

export const MESSAGE_SCORE = {
  // Format bonus is deliberately smaller than the vague penalty is severe -- vague-ness is checked
  // first in messageScore(), so a conventional-prefixed but content-free message ("feat: update")
  // never reaches this value at all. See commit-score.ts.
  conventional: 1.05,
  clear: 1.0,
  long: 0.9,
  short: 0.5,
  vague: 0.35,
}

export const QUALIFIED_MESSAGE_SCORE_CEILING = 0.5

// A commit with any real change (i.e. not classified "empty") always earns at least this much,
// regardless of how the multiplicative bands above work out -- 0 is reserved for commits with no
// actual content, not for commits that are merely large or poorly shaped.
export const MERGE_MIN_SCORE = 0.1
export const NONEMPTY_MIN_SCORE = 0.2

export const TYPE_FACTORS: Record<CommitKind, number> = {
  normal: 1.0,
  merge: 0.0,
  // Real integration work, but the diff was (or could have been) already counted in the PR's own
  // commits -- sits between a no-credit merge and full-credit normal authorship.
  squash_merge: 0.5,
  empty: 0.0,
  conflict_resolve: 0.4,
  revert: 0.5,
  dependency_update: 0.6,
  lockfile_only: 0.15,
  formatting: 0.4,
  generated_files: 0.1,
  asset_only: 0.4,
  rename_only: 0.6,
}

export const QUALIFIED_COMMIT_MIN_SCORE = 0.6

// Daily activity is compressed by total raw score for the day, not decayed per commit by its
// chronological position -- a normal 11th commit of the day is still a normal commit, it's the
// day's *total* that has diminishing marginal value past a point. Brackets are cumulative: the
// first DAILY_COMPRESSION_BRACKETS[0].max points of raw score count in full, the next bracket's
// span counts at its own rate, and so on. See period-score.ts `compressDailyRaw`.
//
// The last bracket's rate is 0, not a small positive number -- a nonzero marginal rate means
// *any* fixed "good day" score is eventually overtaken by enough additional commits, no matter how
// small the rate (simulated: with a 0.25 marginal tail, 100 spammy 2-line commits out-scored 4
// well-sized ones even after the maximum fragmentation penalty). Without file-path/diff-overlap
// data there's no way to tell a genuinely large multi-task day from artificial fragmentation, so
// rather than trying to out-penalize an unbounded raw sum, daily score is hard-capped at 7 --
// keeps rewarding real activity up to a generous point, then stops being exploitable by volume.
export const DAILY_COMPRESSION_BRACKETS: Array<{ max: number; rate: number }> = [
  { max: 4, rate: 1.0 },
  { max: 8, rate: 0.5 },
  { max: 13, rate: 0.2 },
  { max: Infinity, rate: 0.0 },
]

// Fragmentation penalty: three cheap, file-path-free signals computed over one day's commits.
// Deliberately excludes any "same file touched repeatedly" signal -- that needs per-commit changed
// file paths, which the commit ledger doesn't store (kept lean on purpose). Add that signal later
// only if these three prove insufficient against an actually-observed gaming pattern.
export const FRAGMENT_TINY_RATIO_THRESHOLD = 0.5
export const FRAGMENT_VAGUE_OR_REPEAT_RATIO_THRESHOLD = 0.4
export const FRAGMENT_MEDIAN_INTERVAL_MINUTES = 5
export const FRAGMENT_PENALTY_BY_WARNING_COUNT: Record<number, number> = {
  0: 1.0,
  1: 1.0,
  2: 0.8,
  3: 0.6,
}

export const TEAM_SIZE_EXPONENT = 0.7

export const BALANCE_FACTOR_BANDS: Array<{ min: number; value: number }> = [
  { min: 0.7, value: 1.0 },
  { min: 0.5, value: 0.95 },
  { min: 0.3, value: 0.9 },
  { min: -Infinity, value: 0.8 },
]

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

/**
 * Same lookup, but the result never decreases as `value` grows -- some band tables (like the
 * rhythm bonus) deliberately dip after a "sweet spot" to discourage going further, but a raw dip
 * means a person's score can drop just from adding one more real commit, which reads as "I did
 * more work and got penalized" rather than "diminishing returns." This clamps each band's payout
 * to the running max of every band at or below it, so the bonus plateaus instead of falling.
 */
export function lookupMonotonicMaxBand(value: number, bands: MaxBand[]): number {
  let runningMax = -Infinity
  for (const band of bands) {
    runningMax = Math.max(runningMax, band.value)
    if (value <= band.max) return runningMax
  }
  return runningMax
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
  conventional: 1.1,
  clear: 1.0,
  long: 0.9,
  short: 0.5,
  vague: 0.3,
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

// The day's first DAILY_FULL_CREDIT_THRESHOLD commits (chronological order) count at full value --
// matches the rhythm bonus's own 7-10 sweet spot, so a normal productive day is never discounted.
// Every commit past that counts at DAILY_VOLUME_DECAY_RATE raised to how far past the threshold it
// is, a smooth curve rather than a cliff: the 11th commit of the day still counts at 95%, the 20th
// at ~60%, the 50th at ~1% -- so splitting one day's work into ever more, ever-smaller commits keeps
// yielding *less* additional score, without any single extra commit ever being zeroed outright.
export const DAILY_FULL_CREDIT_THRESHOLD = 10
export const DAILY_VOLUME_DECAY_RATE = 0.95

export const RHYTHM_BONUS_BANDS: MaxBand[] = [
  { max: 0, value: 0 },
  { max: 1, value: 0.3 },
  { max: 3, value: 0.8 },
  { max: 6, value: 1.5 },
  { max: 10, value: 2.0 },
  { max: 14, value: 1.5 },
  { max: Infinity, value: 0.8 },
]

export const SMALL_DIFF_PENALTY = { threshold: 0.5, multiplier: 0.7 }
export const VAGUE_MESSAGE_PENALTY = { threshold: 0.5, multiplier: 0.8 }

export const ACTIVE_DAY_THRESHOLD = 2.0

export const CONSISTENCY_BONUS_BANDS: MaxBand[] = [
  { max: 1, value: 0 },
  { max: 2, value: 1 },
  { max: 3, value: 2 },
  { max: 4, value: 3 },
  { max: 5, value: 4 },
  { max: Infinity, value: 5 },
]

export const TEAM_SIZE_EXPONENT = 0.7

export const BALANCE_FACTOR_BANDS: Array<{ min: number; value: number }> = [
  { min: 0.7, value: 1.0 },
  { min: 0.5, value: 0.95 },
  { min: 0.3, value: 0.9 },
  { min: -Infinity, value: 0.8 },
]

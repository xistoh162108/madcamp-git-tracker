import type { CommitKind, CommitRecord } from "../aggregation/types"
import {
  FILE_BANDS,
  MERGE_MIN_SCORE,
  MESSAGE_SCORE,
  NONEMPTY_MIN_SCORE,
  QUALIFIED_COMMIT_MIN_SCORE,
  QUALIFIED_MESSAGE_SCORE_CEILING,
  SIZE_BANDS,
  TYPE_FACTORS,
  lookupMaxBand,
} from "./constants"

export function sizeScore(changedLines: number): number {
  return lookupMaxBand(changedLines, SIZE_BANDS)
}

export function fileScore(changedFiles: number): number {
  return lookupMaxBand(changedFiles, FILE_BANDS)
}

// Vague is checked before the conventional-prefix bonus -- a content-free message like
// "feat: update" shouldn't be rescued by having the right prefix. Clarity beats formatting.
export function messageScore(input: {
  isConventionalMessage?: boolean
  messageLength?: number
  isVagueMessage?: boolean
}): number {
  if (input.isVagueMessage) return MESSAGE_SCORE.vague
  if (input.isConventionalMessage) return MESSAGE_SCORE.conventional
  const length = input.messageLength ?? 0
  if (length < 10) return MESSAGE_SCORE.short
  if (length <= 72) return MESSAGE_SCORE.clear
  return MESSAGE_SCORE.long
}

/** Unclassified commits (pre-migration ledger lines not yet backfilled) fall back to a neutral 1.0
 *  factor rather than 0 -- see the rollout note in the plan: this avoids the whole leaderboard
 *  crashing toward zero during the brief window between a deploy and the backfill script completing. */
export function typeFactor(kind: CommitKind | undefined): number {
  if (kind === undefined) return 1.0
  return TYPE_FACTORS[kind]
}

/**
 * Only a truly empty commit (no lines, no files changed) scores exactly 0 -- every other commit
 * represents *some* real work, so it gets a small floor rather than being crushed to 0 by the
 * bands. Merge commits get the lowest floor since they're an integration event, not a unit of
 * work; everything else (including squash_merge) gets a slightly higher floor since it's still an
 * authored change.
 *
 * size×file uses sqrt(size×file) rather than a plain product -- a plain product means two only-
 * moderately-bad factors (e.g. a legitimately large refactor: size=0.4, file=0.4) compound into a
 * near-zero score (0.16) indistinguishable from genuine junk. The geometric mean still penalizes
 * being large/sprawling, just not catastrophically from two factors at once.
 */
export function commitScore(commit: CommitRecord): number {
  const changedLines = (commit.additions ?? 0) + (commit.deletions ?? 0)
  const changedFiles = commit.changedFiles ?? 0
  const raw =
    Math.sqrt(sizeScore(changedLines) * fileScore(changedFiles)) * messageScore(commit) * typeFactor(commit.commitKind)
  if (commit.commitKind === "empty") return raw
  const floor = commit.commitKind === "merge" ? MERGE_MIN_SCORE : NONEMPTY_MIN_SCORE
  return Math.max(raw, floor)
}

export function isQualifiedCommit(commit: CommitRecord): boolean {
  return typeFactor(commit.commitKind) > 0 && commitScore(commit) >= QUALIFIED_COMMIT_MIN_SCORE
}

export function hasLowQualityMessage(commit: CommitRecord): boolean {
  return messageScore(commit) <= QUALIFIED_MESSAGE_SCORE_CEILING
}

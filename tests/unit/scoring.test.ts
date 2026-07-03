import { describe, expect, it } from "vitest"
import { classifyCommit } from "../../src/scoring/classify-commit"
import {
  commitScore,
  fileScore,
  isQualifiedCommit,
  messageScore,
  sizeScore,
  typeFactor,
} from "../../src/scoring/commit-score"
import { dailyScore, teamScore, weeklyScore } from "../../src/scoring/period-score"
import type { CommitRecord } from "../../src/aggregation/types"
import { aggregateSnapshot } from "../../src/aggregation/aggregate"
import { parseParticipantsCsv } from "../../src/participants/parse-participants"

function commit(overrides: Partial<CommitRecord> & { sha: string }): CommitRecord {
  return {
    repoName: "2026-summer-w1-c1-01",
    week: 1,
    class: 1,
    teamNumber: "01",
    participantId: "p1",
    committedAt: "2026-07-02T10:00:00+09:00",
    ...overrides,
  }
}

describe("classifyCommit", () => {
  it("classifies a normal feature commit", () => {
    const result = classifyCommit({
      message: "feat: add login form",
      additions: 30,
      deletions: 10,
      changedFiles: 3,
      filePaths: [{ filename: "src/login.ts", status: "modified" }],
      parentCount: 1,
    })
    expect(result.kind).toBe("normal")
    expect(result.isConventionalMessage).toBe(true)
  })

  it("classifies a merge commit by parent count regardless of message", () => {
    const result = classifyCommit({
      message: "feat: this looks like a normal message",
      additions: 5,
      deletions: 5,
      changedFiles: 2,
      filePaths: [{ filename: "a.ts", status: "modified" }],
      parentCount: 2,
    })
    expect(result.kind).toBe("merge")
  })

  it("classifies an empty commit", () => {
    const result = classifyCommit({
      message: "chore: empty commit",
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      filePaths: [],
      parentCount: 1,
    })
    expect(result.kind).toBe("empty")
  })

  it("classifies a conflict-resolve commit by message", () => {
    const result = classifyCommit({
      message: "fix merge conflict in App.tsx",
      additions: 4,
      deletions: 2,
      changedFiles: 1,
      filePaths: [{ filename: "App.tsx", status: "modified" }],
      parentCount: 1,
    })
    expect(result.kind).toBe("conflict_resolve")
  })

  it("classifies a revert commit", () => {
    const result = classifyCommit({
      message: 'Revert "feat: add login form"',
      additions: 30,
      deletions: 10,
      changedFiles: 3,
      filePaths: [{ filename: "src/login.ts", status: "modified" }],
      parentCount: 1,
    })
    expect(result.kind).toBe("revert")
  })

  it("classifies a dependency update from message when files stay small", () => {
    const result = classifyCommit({
      message: "chore: bump lodash to 4.17.21",
      additions: 2,
      deletions: 2,
      changedFiles: 2,
      filePaths: [
        { filename: "package.json", status: "modified" },
        { filename: "pnpm-lock.yaml", status: "modified" },
      ],
      parentCount: 1,
    })
    expect(result.kind).toBe("dependency_update")
  })

  it("classifies a dependency update from file set alone", () => {
    const result = classifyCommit({
      message: "update deps",
      additions: 40,
      deletions: 10,
      changedFiles: 2,
      filePaths: [
        { filename: "package.json", status: "modified" },
        { filename: "package-lock.json", status: "modified" },
      ],
      parentCount: 1,
    })
    expect(result.kind).toBe("dependency_update")
  })

  it("classifies a lockfile-only commit (takes precedence over dependency_update)", () => {
    const result = classifyCommit({
      message: "chore: update lockfile",
      additions: 500,
      deletions: 400,
      changedFiles: 1,
      filePaths: [{ filename: "pnpm-lock.yaml", status: "modified" }],
      parentCount: 1,
    })
    expect(result.kind).toBe("lockfile_only")
  })

  it("classifies a formatting commit", () => {
    const result = classifyCommit({
      message: "style: run prettier",
      additions: 200,
      deletions: 180,
      changedFiles: 20,
      filePaths: [{ filename: "src/a.ts", status: "modified" }],
      parentCount: 1,
    })
    expect(result.kind).toBe("formatting")
  })

  it("does not classify a genuine UI-polish style commit as formatting", () => {
    const result = classifyCommit({
      message: "style: polish leaderboard card layout",
      additions: 20,
      deletions: 5,
      changedFiles: 2,
      filePaths: [{ filename: "components/leaderboard.tsx", status: "modified" }],
      parentCount: 1,
    })
    expect(result.kind).toBe("normal")
  })

  it("classifies generated-files-only commits", () => {
    const result = classifyCommit({
      message: "chore: update build output",
      additions: 5000,
      deletions: 4000,
      changedFiles: 3,
      filePaths: [
        { filename: "dist/bundle.js", status: "modified" },
        { filename: "dist/bundle.js.map", status: "modified" },
      ],
      parentCount: 1,
    })
    expect(result.kind).toBe("generated_files")
  })

  it("classifies asset-only commits", () => {
    const result = classifyCommit({
      message: "chore: add logo",
      additions: 0,
      deletions: 0,
      changedFiles: 1,
      filePaths: [{ filename: "public/logo.png", status: "added" }],
      parentCount: 1,
    })
    expect(result.kind).toBe("asset_only")
  })

  it("classifies rename-only commits", () => {
    const result = classifyCommit({
      message: "refactor: reorganize components directory",
      additions: 0,
      deletions: 0,
      changedFiles: 2,
      filePaths: [
        { filename: "components/old-a.tsx", status: "renamed" },
        { filename: "components/old-b.tsx", status: "renamed" },
      ],
      parentCount: 1,
    })
    expect(result.kind).toBe("rename_only")
  })

  it("prioritizes empty over merge when both conditions technically hold", () => {
    const result = classifyCommit({
      message: "merge with nothing changed",
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      filePaths: [],
      parentCount: 2,
    })
    expect(result.kind).toBe("empty")
  })

  it("flags known-vague messages", () => {
    expect(
      classifyCommit({ message: "wip", additions: 1, deletions: 0, changedFiles: 1, filePaths: [], parentCount: 1 })
        .isVagueMessage,
    ).toBe(true)
    expect(
      classifyCommit({
        message: "feat: add login form",
        additions: 1,
        deletions: 0,
        changedFiles: 1,
        filePaths: [],
        parentCount: 1,
      }).isVagueMessage,
    ).toBe(false)
  })
})

describe("sizeScore / fileScore boundaries", () => {
  it("covers every size band edge", () => {
    expect(sizeScore(0)).toBeCloseTo(0.0)
    expect(sizeScore(1)).toBeCloseTo(0.2)
    expect(sizeScore(2)).toBeCloseTo(0.2)
    expect(sizeScore(3)).toBeCloseTo(0.6)
    expect(sizeScore(9)).toBeCloseTo(0.6)
    expect(sizeScore(10)).toBeCloseTo(1.0)
    expect(sizeScore(300)).toBeCloseTo(1.0)
    expect(sizeScore(301)).toBeCloseTo(0.8)
    expect(sizeScore(800)).toBeCloseTo(0.8)
    expect(sizeScore(801)).toBeCloseTo(0.4)
    expect(sizeScore(1500)).toBeCloseTo(0.4)
    expect(sizeScore(1501)).toBeCloseTo(0.15)
  })

  it("covers every file-count band edge", () => {
    expect(fileScore(0)).toBeCloseTo(0.0)
    expect(fileScore(1)).toBeCloseTo(1.0)
    expect(fileScore(8)).toBeCloseTo(1.0)
    expect(fileScore(9)).toBeCloseTo(0.8)
    expect(fileScore(15)).toBeCloseTo(0.8)
    expect(fileScore(16)).toBeCloseTo(0.4)
    expect(fileScore(30)).toBeCloseTo(0.4)
    expect(fileScore(31)).toBeCloseTo(0.15)
  })
})

describe("messageScore", () => {
  it("rewards conventional prefixes regardless of length", () => {
    expect(messageScore({ isConventionalMessage: true, messageLength: 6 })).toBeCloseTo(1.1)
  })
  it("penalizes known-vague messages", () => {
    expect(messageScore({ isVagueMessage: true, messageLength: 2 })).toBeCloseTo(0.3)
  })
  it("scores by length when neither conventional nor vague", () => {
    expect(messageScore({ messageLength: 5 })).toBeCloseTo(0.5)
    expect(messageScore({ messageLength: 40 })).toBeCloseTo(1.0)
    expect(messageScore({ messageLength: 100 })).toBeCloseTo(0.9)
  })
})

describe("typeFactor / commitScore / isQualifiedCommit", () => {
  it("falls back to a neutral 1.0 factor for unclassified (pre-migration) commits", () => {
    expect(typeFactor(undefined)).toBe(1.0)
  })

  it("excludes merge and empty commits from qualified status even though merge gets a minimum floor", () => {
    const mergeCommit = commit({
      sha: "m1",
      additions: 40,
      deletions: 10,
      changedFiles: 3,
      commitKind: "merge",
      isConventionalMessage: true,
    })
    // merge commits never score 0 outright (real work still happened), but they're capped low
    // enough that they can never clear the qualified-commit bar on their own.
    expect(commitScore(mergeCommit)).toBeCloseTo(0.1)
    expect(isQualifiedCommit(mergeCommit)).toBe(false)

    const emptyCommit = commit({ sha: "e1", additions: 0, deletions: 0, changedFiles: 0, commitKind: "empty" })
    expect(commitScore(emptyCommit)).toBe(0)
    expect(isQualifiedCommit(emptyCommit)).toBe(false)
  })

  it("qualifies a well-sized, well-messaged normal commit", () => {
    const good = commit({
      sha: "g1",
      additions: 40,
      deletions: 10,
      changedFiles: 3,
      commitKind: "normal",
      isConventionalMessage: true,
    })
    expect(commitScore(good)).toBeCloseTo(1.0 * 1.0 * 1.1 * 1.0)
    expect(isQualifiedCommit(good)).toBe(true)
  })
})

describe("dailyScore / weeklyScore / teamScore", () => {
  const qualifiedCommit = (sha: string, at: string) =>
    commit({
      sha,
      committedAt: at,
      additions: 40,
      deletions: 10,
      changedFiles: 3,
      commitKind: "normal",
      isConventionalMessage: true,
    })

  it("caps the score contribution at the first 10 commits but keeps counting qualified beyond that", () => {
    const commits = Array.from({ length: 12 }, (_, i) => qualifiedCommit(`c${i}`, `2026-07-02T0${i % 9}:00:00+09:00`))
    const result = dailyScore(commits)
    expect(result.qualifiedCount).toBe(12)
    // 10 capped commits at commitScore ~1.21 each + rhythm bonus for 12 qualified commits (11-14 band -> +1.5)
    expect(result.score).toBeCloseTo(10 * (1.0 * 1.0 * 1.1) + 1.5, 1)
  })

  it("applies the small-diff-spam penalty when >=50% of the day's commits are 1-2 line changes", () => {
    const tiny = () =>
      commit({ sha: `t${Math.random()}`, additions: 1, deletions: 0, changedFiles: 1, commitKind: "normal" })
    const commits = [tiny(), tiny(), qualifiedCommit("q1", "2026-07-02T10:00:00+09:00")]
    const result = dailyScore(commits)
    // 2/3 commits are tiny (>=50%) -> 0.7x multiplier applied to the summed commitScore before rhythm bonus
    expect(result.qualifiedCount).toBe(1)
  })

  it("computes weekly consistency bonus from active-day count", () => {
    const active = { score: 2.5, qualifiedCount: 3 }
    const inactive = { score: 0.5, qualifiedCount: 0 }
    const result = weeklyScore([active, active, active, inactive])
    expect(result.activeDayCount).toBe(3)
    expect(result.score).toBeCloseTo(2.5 * 3 + 0.5 + 2, 5) // 3 active days -> +2 consistency bonus
  })

  it("normalizes team score by team size and applies the balance factor", () => {
    const balanced = teamScore([10, 10], [5, 5], 2)
    const unbalanced = teamScore([18, 2], [9, 1], 2)
    expect(balanced.balanceRatio).toBe(1)
    expect(balanced.balanceFactor).toBe(1.0)
    expect(unbalanced.balanceRatio).toBeCloseTo(0.2)
    expect(unbalanced.balanceFactor).toBe(0.8)
    // same raw total (20) but the unbalanced team is penalized
    expect(unbalanced.score).toBeLessThan(balanced.score)
  })
})

describe("aggregateSnapshot with classified commits", () => {
  it("computes score/qualifiedCommits additively without disturbing the raw commits count", () => {
    const { participants } = parseParticipantsCsv("participant_id,name,identifier,class\np1,김가온,gaon-kim,1")
    const commits: CommitRecord[] = [
      commit({
        sha: "a",
        participantId: "p1",
        additions: 40,
        deletions: 10,
        changedFiles: 3,
        commitKind: "normal",
        isConventionalMessage: true,
        committedAt: "2026-07-02T10:00:00+09:00",
      }),
      commit({
        sha: "b",
        participantId: "p1",
        additions: 0,
        deletions: 0,
        changedFiles: 1,
        commitKind: "merge",
        committedAt: "2026-07-02T11:00:00+09:00",
      }),
    ]
    const snapshot = aggregateSnapshot({
      season: "2026-summer",
      currentWeek: 1,
      participants,
      commits,
    })
    const entry = snapshot.rankings.personal.find((item) => item.label === "김가온")
    expect(entry?.commits).toBe(2)
    expect(entry?.qualifiedCommits).toBe(1)
    expect(entry?.score).toBeGreaterThan(0)
  })

  it("defaults to commits-based ranking behavior identically to before this feature when no scoring data present", () => {
    const { participants } = parseParticipantsCsv("participant_id,name,identifier,class\np1,김가온,gaon-kim,1")
    const snapshot = aggregateSnapshot({
      season: "2026-summer",
      currentWeek: null,
      participants,
      commits: [],
    })
    expect(snapshot.rankings.personal).toEqual([])
  })
})

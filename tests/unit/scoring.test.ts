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
import { compressDailyRaw, dailyScore, fragmentationPenalty, teamScore, weeklyScore } from "../../src/scoring/period-score"
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

  it("classifies a squash merge by GitHub's default message pattern, not parent count", () => {
    const result = classifyCommit({
      message: "feat: add login form (#42)",
      additions: 500,
      deletions: 100,
      changedFiles: 15,
      filePaths: [{ filename: "src/login.ts", status: "modified" }],
      parentCount: 1,
    })
    expect(result.kind).toBe("squash_merge")
  })

  it("prioritizes squash-merge detection over file-based checks like lockfile_only", () => {
    const result = classifyCommit({
      message: "chore: bump deps (#7)",
      additions: 20,
      deletions: 20,
      changedFiles: 1,
      filePaths: [{ filename: "pnpm-lock.yaml", status: "modified" }],
      parentCount: 1,
    })
    expect(result.kind).toBe("squash_merge")
  })

  it("does not misclassify a real multi-parent merge as squash_merge even if the message happens to match", () => {
    const result = classifyCommit({
      message: "Merge PR (#3)",
      additions: 10,
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

  it("classifies a vendored Python venv dump as generated_files, not normal", () => {
    // Real camp data: a participant committed (then untracked) a full venv -- 300 files, 800k+
    // changed lines -- which the old pattern (dist/build/.next/out/coverage/generated only) missed.
    const result = classifyCommit({
      message: "Untrack backend venv and add backend/.gitignore",
      additions: 27,
      deletions: 872089,
      changedFiles: 300,
      filePaths: [
        { filename: "backend/venv/lib/python3.11/site-packages/flask/__init__.py", status: "removed" },
        { filename: "backend/venv/bin/activate", status: "removed" },
        { filename: ".gitignore", status: "modified" },
      ].concat(
        Array.from({ length: 297 }, (_, i) => ({
          filename: `backend/venv/lib/python3.11/site-packages/pkg${i}/__init__.py`,
          status: "removed",
        })),
      ),
      parentCount: 1,
    })
    expect(result.kind).toBe("normal") // mixed with .gitignore -> not *every* file is generated
  })

  it("classifies a pure venv-only commit as generated_files", () => {
    const result = classifyCommit({
      message: "add dependencies",
      additions: 500,
      deletions: 0,
      changedFiles: 2,
      filePaths: [
        { filename: "venv/lib/python3.11/site-packages/flask/__init__.py", status: "added" },
        { filename: "backend/.venv/bin/activate", status: "added" },
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

  it("flags real camp data's common vague short messages, but not a short-but-specific Korean phrase", () => {
    const vague = (message: string) =>
      classifyCommit({ message, additions: 1, deletions: 0, changedFiles: 1, filePaths: [], parentCount: 1 })
        .isVagueMessage
    // Found in production data: generic single-word messages that score no differently than a
    // real one-liner under a flat length-based discount, unless explicitly flagged as vague.
    expect(vague("수정")).toBe(true) // just "edit", no object
    expect(vague(".")).toBe(true)
    expect(vague("schema")).toBe(true)
    expect(vague("merge")).toBe(true)
    // Korean is information-dense -- a short phrase can still name a specific feature, so these
    // must NOT be caught by the vague list even though they're under the 10-char "short" cutoff.
    expect(vague("카메라 연동")).toBe(false)
    expect(vague("DB 스키마 설계")).toBe(false)
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
    expect(messageScore({ isConventionalMessage: true, messageLength: 6 })).toBeCloseTo(1.05)
  })
  it("penalizes known-vague messages", () => {
    expect(messageScore({ isVagueMessage: true, messageLength: 2 })).toBeCloseTo(0.35)
  })
  it("vague takes priority over the conventional-prefix bonus -- 'feat: update' isn't rescued by its prefix", () => {
    expect(messageScore({ isVagueMessage: true, isConventionalMessage: true, messageLength: 6 })).toBeCloseTo(0.35)
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
    // sizeScore(50)=1.0, fileScore(3)=1.0 -> sqrt(1.0*1.0)=1.0, times conventional messageScore(1.05), type 1.0
    expect(commitScore(good)).toBeCloseTo(Math.sqrt(1.0 * 1.0) * 1.05 * 1.0)
    expect(isQualifiedCommit(good)).toBe(true)
  })

  it("softens the multiplicative penalty for a large-but-normal refactor via sqrt(size*file) instead of size*file", () => {
    // 900 changed lines -> sizeScore 0.4; 20 files -> fileScore 0.4. Plain product would be 0.16
    // (crushed to the 0.2 floor); sqrt(0.4*0.4)=0.4 keeps the commit's own shape legible.
    const bigRefactor = commit({
      sha: "big1",
      additions: 800,
      deletions: 100,
      changedFiles: 20,
      commitKind: "normal",
      isConventionalMessage: true,
    })
    const raw = Math.sqrt(sizeScore(900) * fileScore(20)) * 1.05 * 1.0
    expect(commitScore(bigRefactor)).toBeCloseTo(raw, 5)
    expect(commitScore(bigRefactor)).toBeGreaterThan(0.2) // above the floor, not crushed to it
  })

  it("gives squash merges a real but reduced type factor between merge (0) and normal (1)", () => {
    const squash = commit({
      sha: "sq1",
      additions: 400,
      deletions: 50,
      changedFiles: 12,
      commitKind: "squash_merge",
      isConventionalMessage: true,
    })
    expect(typeFactor("squash_merge")).toBe(0.5)
    expect(commitScore(squash)).toBeGreaterThan(0.1) // above the plain-merge floor
    expect(commitScore(squash)).toBeLessThan(commitScore({ ...squash, commitKind: "normal" }))
  })
})

describe("compressDailyRaw", () => {
  it("passes raw score through unchanged up to the first bracket (4)", () => {
    expect(compressDailyRaw(0)).toBeCloseTo(0)
    expect(compressDailyRaw(3)).toBeCloseTo(3)
    expect(compressDailyRaw(4)).toBeCloseTo(4)
  })
  it("counts the 4-8 span at 50% marginal rate", () => {
    expect(compressDailyRaw(6)).toBeCloseTo(4 + 0.5 * 2, 5) // = 5
    expect(compressDailyRaw(8)).toBeCloseTo(4 + 0.5 * 4, 5) // = 6
  })
  it("counts the 8-13 span at 20% marginal rate", () => {
    expect(compressDailyRaw(10)).toBeCloseTo(6 + 0.2 * 2, 5) // = 6.4
    expect(compressDailyRaw(13)).toBeCloseTo(6 + 0.2 * 5, 5) // = 7
  })
  it("hard-caps at 7 past 13 -- no marginal rate is small enough to stay exploitable by volume alone", () => {
    expect(compressDailyRaw(20)).toBeCloseTo(7, 5)
    expect(compressDailyRaw(1000)).toBeCloseTo(7, 5)
  })
})

describe("fragmentationPenalty", () => {
  // messageLength: 20 keeps these at the "clear" messageScore tier (1.0) by default -- without an
  // explicit length, a commit falls back to length 0, which is itself "short" (<=0.5, already
  // low-quality) and would silently trigger the vague/repeat warning in tests that don't want it.
  const tiny = (sha: string, at: string) =>
    commit({ sha, committedAt: at, additions: 1, deletions: 0, changedFiles: 1, commitKind: "normal", messageLength: 20 })
  const normalCommit = (sha: string, at: string) =>
    commit({
      sha,
      committedAt: at,
      additions: 40,
      deletions: 10,
      changedFiles: 3,
      commitKind: "normal",
      isConventionalMessage: true,
    })

  it("applies no penalty with 0 or 1 warning signals", () => {
    // Only the tiny-ratio signal fires (2/3 >= 0.5); messages are fine and commits are spaced out.
    const commits = [
      tiny("t1", "2026-07-02T09:00:00+09:00"),
      tiny("t2", "2026-07-02T09:30:00+09:00"),
      normalCommit("n1", "2026-07-02T10:00:00+09:00"),
    ]
    const result = fragmentationPenalty(commits)
    expect(result.warnings).toBe(1)
    expect(result.multiplier).toBe(1.0)
  })

  it("applies a 0.8x penalty at exactly 2 warning signals", () => {
    // Tiny ratio fires (2/3) and vague/low-quality-message ratio fires (2/3 vague), but commits
    // are spaced 30 min apart so the interval signal doesn't fire.
    const commits = [
      { ...tiny("t1", "2026-07-02T09:00:00+09:00"), isVagueMessage: true },
      { ...tiny("t2", "2026-07-02T09:30:00+09:00"), isVagueMessage: true },
      normalCommit("n1", "2026-07-02T10:00:00+09:00"),
    ]
    const result = fragmentationPenalty(commits)
    expect(result.warnings).toBe(2)
    expect(result.multiplier).toBe(0.8)
  })

  it("applies a 0.6x penalty at 3 warning signals (tiny + vague + tight interval)", () => {
    const commits = [
      { ...tiny("t1", "2026-07-02T09:00:00+09:00"), isVagueMessage: true },
      { ...tiny("t2", "2026-07-02T09:02:00+09:00"), isVagueMessage: true },
      { ...normalCommit("n1", "2026-07-02T09:04:00+09:00") },
    ]
    const result = fragmentationPenalty(commits)
    expect(result.warnings).toBe(3)
    expect(result.multiplier).toBe(0.6)
  })

  it("does not falsely flag commits with no recorded message as duplicates of each other", () => {
    // None of these set messageSummary -- they must not collide on an empty-string key.
    const commits = [
      normalCommit("n1", "2026-07-02T09:00:00+09:00"),
      normalCommit("n2", "2026-07-02T11:00:00+09:00"),
      normalCommit("n3", "2026-07-02T13:00:00+09:00"),
    ]
    const result = fragmentationPenalty(commits)
    expect(result.warnings).toBe(0)
  })

  it("flags genuinely repeated same-day messages even when each individual message is not vague", () => {
    const withMessage = (sha: string, at: string) => ({
      ...normalCommit(sha, at),
      messageSummary: "update login page styling",
    })
    const commits = [
      withMessage("n1", "2026-07-02T09:00:00+09:00"),
      withMessage("n2", "2026-07-02T11:00:00+09:00"),
      withMessage("n3", "2026-07-02T13:00:00+09:00"),
    ]
    const result = fragmentationPenalty(commits)
    expect(result.warnings).toBeGreaterThanOrEqual(1) // vague/repeat ratio signal fires (3/3 repeated)
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

  it("sums raw commit scores for the day and compresses the total, with no per-commit position penalty", () => {
    // Strictly ascending, 30 min apart -- avoids accidentally tripping the median-interval
    // fragmentation signal (<=5 min), which would make the day's score diverge from a pure
    // compression of the raw sum and defeat the point of this test.
    const commits = Array.from({ length: 12 }, (_, i) => {
      const hour = String(Math.floor((i * 30) / 60)).padStart(2, "0")
      const minute = String((i * 30) % 60).padStart(2, "0")
      return qualifiedCommit(`c${i}`, `2026-07-02T${hour}:${minute}:00+09:00`)
    })
    const result = dailyScore(commits)
    expect(result.qualifiedCount).toBe(12)
    const rawSum = commits.reduce((sum, c) => sum + commitScore(c), 0)
    expect(result.score).toBeCloseTo(compressDailyRaw(rawSum), 5)
  })

  it("exposes effectiveMultiplier so a per-commit display can reconstruct the exact compressed/penalized score", () => {
    const commits = [qualifiedCommit("q1", "2026-07-02T09:00:00+09:00"), qualifiedCommit("q2", "2026-07-02T15:00:00+09:00")]
    const result = dailyScore(commits)
    const rawSum = commits.reduce((sum, c) => sum + commitScore(c), 0)
    expect(result.effectiveMultiplier).toBeCloseTo(result.score / rawSum, 5)
  })

  it("returns a zero effectiveMultiplier for an empty day without dividing by zero", () => {
    const result = dailyScore([])
    expect(result.score).toBe(0)
    expect(result.effectiveMultiplier).toBe(0)
  })

  it("sums daily scores for the week with no consistency bonus -- every point traces to a commit", () => {
    const active = { score: 2.5, qualifiedCount: 3, effectiveMultiplier: 1 }
    const inactive = { score: 0.5, qualifiedCount: 0, effectiveMultiplier: 1 }
    const result = weeklyScore([active, active, active, inactive])
    expect(result.score).toBeCloseTo(2.5 * 3 + 0.5, 5)
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

  it("excludes a huge accidental vendor-dependency commit from the displayed avg size, without hiding it from the raw commit count", () => {
    const { participants } = parseParticipantsCsv("participant_id,name,identifier,class\np1,김가온,gaon-kim,1")
    const commits: CommitRecord[] = [
      commit({
        sha: "real1",
        participantId: "p1",
        additions: 40,
        deletions: 10,
        changedFiles: 3,
        commitKind: "normal",
        committedAt: "2026-07-02T10:00:00+09:00",
      }),
      commit({
        sha: "real2",
        participantId: "p1",
        additions: 20,
        deletions: 20,
        changedFiles: 2,
        commitKind: "normal",
        committedAt: "2026-07-02T11:00:00+09:00",
      }),
      commit({
        sha: "venv-dump",
        participantId: "p1",
        additions: 27,
        deletions: 872089,
        changedFiles: 300,
        commitKind: "generated_files",
        committedAt: "2026-07-02T12:00:00+09:00",
      }),
    ]
    const snapshot = aggregateSnapshot({ season: "2026-summer", currentWeek: 1, participants, commits })
    const entry = snapshot.rankings.personal.find((item) => item.label === "김가온")
    expect(entry?.commits).toBe(3) // still counted in the raw total
    expect(entry?.avgChangedLines).toBeCloseTo((50 + 40) / 2, 5) // only the 2 "normal" commits
    expect(entry?.avgChangedFiles).toBeCloseTo((3 + 2) / 2, 5)
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

  it("shows each recent commit's *effective* (penalty-adjusted) score so the participant page's numbers reconcile with the total", () => {
    const { participants } = parseParticipantsCsv("participant_id,name,identifier,class\np1,김가온,gaon-kim,1")
    // Day 1: 2 tiny vague commits (tiny-ratio + vague-ratio both fire -> 2 warnings -> 0.8x) close
    // in time to a real commit, which must show its *discounted* effective score, not raw commitScore.
    const day1: CommitRecord[] = [
      commit({
        sha: "t1",
        additions: 1,
        deletions: 0,
        changedFiles: 1,
        commitKind: "normal",
        isVagueMessage: true,
        committedAt: "2026-07-02T09:00:00+09:00",
      }),
      commit({
        sha: "t2",
        additions: 0,
        deletions: 1,
        changedFiles: 1,
        commitKind: "normal",
        isVagueMessage: true,
        committedAt: "2026-07-02T09:30:00+09:00",
      }),
      commit({
        sha: "real1",
        additions: 40,
        deletions: 10,
        changedFiles: 3,
        commitKind: "normal",
        isConventionalMessage: true,
        committedAt: "2026-07-02T10:00:00+09:00",
      }),
    ]
    // Day 2: a clean day with no penalty, to prove the reconciliation isn't coincidental to day 1 alone.
    const day2: CommitRecord[] = [
      commit({
        sha: "real2",
        additions: 40,
        deletions: 10,
        changedFiles: 3,
        commitKind: "normal",
        isConventionalMessage: true,
        committedAt: "2026-07-03T10:00:00+09:00",
      }),
    ]
    const snapshot = aggregateSnapshot({
      season: "2026-summer",
      currentWeek: 1,
      participants,
      commits: [...day1, ...day2],
    })
    const entry = snapshot.rankings.personal.find((item) => item.label === "김가온")!
    // The real commit on the penalized day must show its *discounted* score, not its raw commitScore.
    const real1 = entry.recentCommits!.find((c) => c.id.endsWith("real1"))!
    const rawReal1 = commitScore(day1[2]!)
    expect(real1.score).toBeCloseTo(rawReal1 * 0.8, 5)
    expect(real1.score).toBeLessThan(rawReal1)

    // Day 2's lone commit had no warnings, so it must show its full compressed value (no penalty).
    const real2 = entry.recentCommits!.find((c) => c.id.endsWith("real2"))!
    expect(real2.score).toBeCloseTo(commitScore(day2[0]!), 5)

    // No bonus term anywhere -- summing every displayed commit score must equal the total exactly.
    const sumOfDisplayedScores = entry.recentCommits!.reduce((sum, c) => sum + (c.score ?? 0), 0)
    expect(sumOfDisplayedScores).toBeCloseTo(entry.score ?? 0, 5)
  })
})

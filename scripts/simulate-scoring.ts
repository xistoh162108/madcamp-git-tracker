// One-off verification script (not run by cron/CI) -- compares the new commitScore/dailyScore
// formula across several ways of committing the *same* total change, to sanity-check that
// appropriately-sized splitting still wins without producing the old formula's 10x+ swings.
// Run with: tsx scripts/simulate-scoring.ts
import { dailyScore } from "../src/scoring/period-score"
import type { CommitRecord, CommitKind } from "../src/aggregation/types"

let shaCounter = 0

function makeCommit(params: {
  linesEach: number
  filesEach: number
  minutesApart: number
  commitKind?: CommitKind
  isConventionalMessage?: boolean
  messageLength?: number
}): (index: number) => CommitRecord {
  return (index: number) => {
    shaCounter += 1
    const at = new Date(Date.UTC(2026, 6, 2, 0, index * params.minutesApart))
    return {
      sha: `sim-${shaCounter}`,
      repoName: "sim-repo",
      week: 1,
      class: 1,
      teamNumber: "01",
      participantId: "p1",
      committedAt: at.toISOString(),
      additions: Math.ceil(params.linesEach / 2),
      deletions: Math.floor(params.linesEach / 2),
      changedFiles: params.filesEach,
      commitKind: params.commitKind ?? "normal",
      isConventionalMessage: params.isConventionalMessage ?? true,
      messageLength: params.messageLength ?? 30,
    }
  }
}

function buildScenario(count: number, factory: (index: number) => CommitRecord): CommitRecord[] {
  return Array.from({ length: count }, (_, i) => factory(i))
}

const scenarios: Array<{ name: string; commits: CommitRecord[] }> = [
  {
    name: "적절한 분할 (4x50줄)",
    commits: buildScenario(4, makeCommit({ linesEach: 50, filesEach: 3, minutesApart: 45 })),
  },
  {
    name: "약간 큰 커밋 (2x100줄)",
    commits: buildScenario(2, makeCommit({ linesEach: 100, filesEach: 5, minutesApart: 90 })),
  },
  {
    name: "한 번에 몰아넣기 (1x200줄)",
    commits: buildScenario(1, makeCommit({ linesEach: 200, filesEach: 8, minutesApart: 0 })),
  },
  {
    name: "과도한 분할 (20x10줄)",
    commits: buildScenario(20, makeCommit({ linesEach: 10, filesEach: 1, minutesApart: 8 })),
  },
  {
    name: "미세 분할 (100x2줄)",
    commits: buildScenario(
      100,
      makeCommit({ linesEach: 2, filesEach: 1, minutesApart: 2, isConventionalMessage: false, messageLength: 4 }),
    ),
  },
  {
    name: "대형 정상 리팩터링 (1x900줄, 20파일)",
    commits: buildScenario(1, makeCommit({ linesEach: 900, filesEach: 20, minutesApart: 0 })),
  },
  {
    name: "생성물 반복 (generated_files x20)",
    commits: buildScenario(
      20,
      makeCommit({ linesEach: 50, filesEach: 2, minutesApart: 10, commitKind: "generated_files" }),
    ),
  },
  {
    name: "squash merge (1x, 500줄/15파일)",
    commits: buildScenario(1, makeCommit({ linesEach: 500, filesEach: 15, minutesApart: 0, commitKind: "squash_merge" })),
  },
]

console.log("시나리오별 하루 점수 비교 (동일/유사 총 변경량, 다른 커밋 방식)\n")
console.log(
  ["시나리오", "커밋수", "총변경줄", "day.score", "qualified"]
    .map((h) => h.padEnd(28))
    .join(""),
)
console.log("-".repeat(120))

for (const scenario of scenarios) {
  const totalLines = scenario.commits.reduce((sum, c) => sum + (c.additions ?? 0) + (c.deletions ?? 0), 0)
  const result = dailyScore(scenario.commits)
  console.log(
    [
      scenario.name,
      String(scenario.commits.length),
      String(totalLines),
      result.score.toFixed(2),
      String(result.qualifiedCount),
    ]
      .map((v) => v.padEnd(28))
      .join(""),
  )
}

const appropriate = dailyScore(scenarios[0]!.commits).score
console.log("\n적절한 분할 대비 비율:")
for (const scenario of scenarios) {
  const ratio = dailyScore(scenario.commits).score / appropriate
  console.log(`  ${scenario.name}: ${ratio.toFixed(2)}x`)
}

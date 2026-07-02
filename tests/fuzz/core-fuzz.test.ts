import { describe, expect, it } from "vitest"
import fc from "fast-check"
import { parseRepoName } from "../../src/github/repo-name-parser"
import { parseParticipantsCsv } from "../../src/participants/parse-participants"
import { AppConfigSchema, resolveCurrentWeek } from "../../src/config/schema"
import { aggregateSnapshot, dedupeCommits } from "../../src/aggregation/aggregate"
import type { CommitRecord } from "../../src/aggregation/types"

describe("repo parser fuzzing", () => {
  it("valid generated repo names round-trip", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("summer", "winter"),
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 99 }),
        (term, week, classNumber, team) => {
          const semCode = term === "summer" ? "s" : "w"
          const name = `26${semCode}-w${week}-c${classNumber}-${String(team).padStart(2, "0")}`
          const parsed = parseRepoName(name, `2026-${term}`)
          expect(parsed).toMatchObject({ week, class: classNumber, teamNumber: String(team).padStart(2, "0") })
        },
      ),
    )
  })

  it("random strings never crash", () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        parseRepoName(name)
        return true
      }),
    )
  })
})

describe("CSV parser fuzzing", () => {
  it("arbitrary input never exits the process", () => {
    fc.assert(
      fc.property(fc.string(), (csv) => {
        try {
          parseParticipantsCsv(csv)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
        return true
      }),
    )
  })

  it("duplicate usernames are rejected", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,8}[a-zA-Z0-9])?$/), (username) => {
        expect(() => parseParticipantsCsv(`name,identifier\nA,${username}\nB,${username.toUpperCase()}`)).toThrow(
          /duplicate/,
        )
      }),
    )
  })
})

describe("KST boundary fuzzing", () => {
  it("configured start and end boundaries are included", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (week) => {
        const startAt = `2026-07-${String(week).padStart(2, "0")}T09:00:00+09:00`
        const endAt = `2026-07-${String(week).padStart(2, "0")}T10:00:00+09:00`
        const config = AppConfigSchema.parse({
          season: "2026-summer",
          displayName: "x",
          timezone: "Asia/Seoul",
          githubOrg: "x",
          classCount: 4,
          weeks: [{ week, label: "w", startAt, endAt, enabled: true }],
          ranking: {
            defaultClassMetric: "averagePerPerson",
            showDailyHighlights: true,
            dailyWindowHours: 24,
          },
        })
        expect(resolveCurrentWeek(config, new Date(startAt))).toBe(week)
        expect(resolveCurrentWeek(config, new Date(endAt))).toBe(week)
      }),
    )
  })
})

describe("aggregation invariant fuzzing", () => {
  it("duplicate SHA does not change totals and unknown users stay out of personal ranking", () => {
    fc.assert(
      fc.property(fc.array(fc.stringMatching(/^[a-f0-9]{1,12}$/), { maxLength: 30 }), (shas) => {
        const commits: CommitRecord[] = shas.flatMap((sha, index) => [
          {
            sha,
            repoName: "2026-summer-w2-c1-01",
            week: 2,
            class: 1,
            teamNumber: "01",
            participantId: index % 2 === 0 ? "p1" : undefined,
            committedAt: "2026-07-12T00:00:00.000Z",
          },
          {
            sha,
            repoName: "2026-summer-w2-c1-01",
            week: 2,
            class: 1,
            teamNumber: "01",
            participantId: index % 2 === 0 ? "p1" : undefined,
            committedAt: "2026-07-12T00:00:00.000Z",
          },
        ])
        const snapshot = aggregateSnapshot({
          season: "2026-summer",
          currentWeek: 2,
          participants: [
            {
              participantId: "p1",
              name: "A",
              identifier: "a",
              identifierType: "github",
              githubUsername: "a",
              class: 1,
              aliases: [],
            },
          ],
          commits,
        })
        const deduped = dedupeCommits(commits)
        expect(snapshot.summary.totalCommits).toBe(deduped.length)
        expect(snapshot.rankings.personal.reduce((sum, item) => sum + item.commits, 0)).toBeLessThanOrEqual(
          deduped.length,
        )
      }),
    )
  })
})

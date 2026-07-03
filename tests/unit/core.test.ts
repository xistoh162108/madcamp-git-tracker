import { describe, expect, it } from "vitest"
import fs from "node:fs"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { adminSessionCookieOptions, getAdminSessionSignature, isValidAdminSession } from "../../src/auth/admin-session"
import { AppConfigSchema, resolveCurrentWeek } from "../../src/config/schema"
import { writeConfig } from "../../src/config/write-config"
import { parseRepoName } from "../../src/github/repo-name-parser"
import { discoverTrackedRepos } from "../../src/github/discover-repos"
import { parseParticipantsCsv } from "../../src/participants/parse-participants"
import { normalizeGithubUsername, ParticipantSchema } from "../../src/participants/participant-schema"
import { readSnapshotFallback, writeSnapshotSafely } from "../../src/snapshot/fallback"
import { analyzeCommitAttribution, mapCommitAuthor, parseCoAuthors } from "../../src/sync/map-commit-author"
import { readSyncState, writeSyncState } from "../../src/sync/sync-state"
import { activityStatsForCommits, aggregateSnapshot, dedupeCommits } from "../../src/aggregation/aggregate"
import type { CommitRecord } from "../../src/aggregation/types"
import { runGithubSync } from "../../src/sync/sync-runner"

const config = AppConfigSchema.parse({
  season: "2026-summer",
  displayName: "2026 여름학기",
  timezone: "Asia/Seoul",
  githubOrg: "madcamp",
  repoNamePattern: "{yy}{semCode}-w{week}-c{class}-{teamNumber}",
  classCount: 4,
  weeks: [
    {
      week: 1,
      label: "1주차",
      startAt: "2026-07-02T09:00:00+09:00",
      endAt: "2026-07-09T08:59:59+09:00",
      enabled: true,
    },
    {
      week: 2,
      label: "2주차",
      startAt: "2026-07-09T09:00:00+09:00",
      endAt: "2026-07-16T08:59:59+09:00",
      enabled: true,
    },
  ],
  ranking: {
    defaultClassMetric: "averagePerPerson",
    showDailyHighlights: true,
    dailyWindowHours: 24,
  },
})

describe("GitHub sync runner", () => {
  it("discovers repos, fetches commits, writes snapshot, and records unknown users", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "madcamp-sync-"))
    const configPath = path.join(tmp, "config.json")
    const participantsPath = path.join(tmp, "participants.csv")
    const snapshotPath = path.join(tmp, "latest.json")
    const ledgerPath = path.join(tmp, "commits.jsonl")
    const reportPath = path.join(tmp, "sync-report.json")
    fs.writeFileSync(configPath, JSON.stringify(config))
    fs.writeFileSync(
      participantsPath,
      "participant_id,name,identifier,class\np1,김가온,gaon-kim,3\np2,외부,e@example.com,3\n",
    )

    const server = http.createServer((request, response) => {
      response.setHeader("content-type", "application/json")
      response.setHeader("x-ratelimit-limit", "5000")
      response.setHeader("x-ratelimit-remaining", "4990")
      response.setHeader("x-ratelimit-used", "10")
      response.setHeader("x-ratelimit-reset", "1782389999")

      if (request.url?.startsWith("/orgs/madcamp/repos")) {
        response.end(
          JSON.stringify([
            {
              id: 1,
              name: "26s-w2-c3-07",
              html_url: "https://github.com/madcamp/26s-w2-c3-07",
              private: true,
              default_branch: "main",
              pushed_at: "2026-07-12T00:00:00Z",
            },
          ]),
        )
        return
      }
      if (request.url?.startsWith("/repos/madcamp/26s-w2-c3-07/branches")) {
        response.end(JSON.stringify([{ name: "main" }, { name: "feature/login" }]))
        return
      }
      if (request.url?.startsWith("/repos/madcamp/26s-w2-c3-07/commits")) {
        const url = new URL(request.url, "http://127.0.0.1")
        if (url.searchParams.get("sha") === "feature/login") {
          response.end(
            JSON.stringify([
              {
                sha: "abc",
                author: { login: "gaon-kim" },
                commit: {
                  message: "feat: dashboard",
                  author: { name: "김가온", email: "g@example.com", date: "2026-07-12T00:00:00Z" },
                },
              },
            ]),
          )
          return
        }
        response.end(
          JSON.stringify([
            {
              sha: "abc",
              author: { login: "gaon-kim" },
              commit: {
                message: "feat: dashboard",
                author: { name: "김가온", email: "g@example.com", date: "2026-07-12T00:00:00Z" },
              },
            },
            {
              sha: "def",
              author: { login: null },
              commit: {
                message: "docs",
                author: { name: "외부", email: "e@example.com", date: "2026-07-12T01:00:00Z" },
              },
            },
          ]),
        )
        return
      }
      response.statusCode = 404
      response.end(JSON.stringify({ message: "not found" }))
    })

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("test server did not start")

    try {
      const result = await runGithubSync({
        configPath,
        participantsPath,
        snapshotPath,
        ledgerPath,
        reportPath,
        githubToken: "test-token",
        githubApiBaseUrl: `http://127.0.0.1:${address.port}`,
      })
      expect(result.ok).toBe(true)
      expect(result.commitsProcessed).toBe(2)
      expect(result.unknownUsers).toBe(0)
      expect(result.report?.status).toBe("success")
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as {
        summary: { totalCommits: number }
        unknownUsers: unknown[]
      }
      expect(snapshot.summary.totalCommits).toBe(2)
      expect(snapshot.unknownUsers).toHaveLength(0)
      expect(fs.readFileSync(ledgerPath, "utf8").trim().split("\n")).toHaveLength(2)
      expect(JSON.parse(fs.readFileSync(reportPath, "utf8"))).toMatchObject({
        status: "success",
        commitScope: "all_branches",
        reposSucceeded: 1,
        branchesScanned: 2,
        commitsFetched: 3,
        uniqueCommits: 2,
      })
      expect(JSON.parse(fs.readFileSync(ledgerPath, "utf8").trim().split("\n")[0]!).sourceBranches).toEqual([
        "main",
        "feature/login",
      ])
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  })

  it("preserves the previous snapshot when every repo fetch fails", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "madcamp-sync-fail-"))
    const configPath = path.join(tmp, "config.json")
    const participantsPath = path.join(tmp, "participants.csv")
    const snapshotPath = path.join(tmp, "latest.json")
    const ledgerPath = path.join(tmp, "commits.jsonl")
    const reportPath = path.join(tmp, "sync-report.json")
    const previousSnapshot = { generatedAt: "2026-01-01T00:00:00.000Z", summary: { totalCommits: 99 } }
    fs.writeFileSync(configPath, JSON.stringify(config))
    fs.writeFileSync(participantsPath, "participant_id,name,identifier,class\np1,김가온,gaon-kim,3\n")
    fs.writeFileSync(snapshotPath, JSON.stringify(previousSnapshot))

    const server = http.createServer((request, response) => {
      response.setHeader("content-type", "application/json")
      if (request.url?.startsWith("/orgs/madcamp/repos")) {
        response.end(
          JSON.stringify([
            {
              id: 1,
              name: "26s-w2-c3-07",
              html_url: "https://github.com/madcamp/26s-w2-c3-07",
              private: true,
              default_branch: "main",
            },
          ]),
        )
        return
      }
      response.statusCode = 500
      response.end(JSON.stringify({ message: "upstream failure" }))
    })

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("test server did not start")

    try {
      const result = await runGithubSync({
        configPath,
        participantsPath,
        snapshotPath,
        ledgerPath,
        reportPath,
        githubToken: "test-token",
        githubApiBaseUrl: `http://127.0.0.1:${address.port}`,
      })
      expect(result.ok).toBe(false)
      expect(result.report?.status).toBe("failed")
      expect(JSON.parse(fs.readFileSync(snapshotPath, "utf8"))).toEqual(previousSnapshot)
      expect(fs.existsSync(path.join(tmp, "last-sync-failure.json"))).toBe(true)
      expect(fs.existsSync(ledgerPath)).toBe(true)
      expect(JSON.parse(fs.readFileSync(reportPath, "utf8")).reposFailed).toBe(1)
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  })

  it("writes a ledger and report but preserves latest when sync is partial", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "madcamp-sync-partial-"))
    const configPath = path.join(tmp, "config.json")
    const participantsPath = path.join(tmp, "participants.csv")
    const snapshotPath = path.join(tmp, "latest.json")
    const ledgerPath = path.join(tmp, "commits.jsonl")
    const reportPath = path.join(tmp, "sync-report.json")
    const previousSnapshot = { generatedAt: "2026-01-01T00:00:00.000Z", summary: { totalCommits: 77 } }
    fs.writeFileSync(configPath, JSON.stringify(config))
    fs.writeFileSync(participantsPath, "participant_id,name,identifier,class\np1,김가온,gaon-kim,3\n")
    fs.writeFileSync(snapshotPath, JSON.stringify(previousSnapshot))

    const server = http.createServer((request, response) => {
      response.setHeader("content-type", "application/json")
      if (request.url?.startsWith("/orgs/madcamp/repos")) {
        response.end(
          JSON.stringify([
            {
              id: 1,
              name: "26s-w2-c3-07",
              html_url: "https://github.com/madcamp/26s-w2-c3-07",
              private: true,
              default_branch: "main",
            },
            {
              id: 2,
              name: "26s-w2-c3-08",
              html_url: "https://github.com/madcamp/26s-w2-c3-08",
              private: true,
              default_branch: "main",
            },
          ]),
        )
        return
      }
      if (request.url?.startsWith("/repos/madcamp/26s-w2-c3-07/branches")) {
        response.end(JSON.stringify([{ name: "main" }]))
        return
      }
      if (request.url?.startsWith("/repos/madcamp/26s-w2-c3-07/commits")) {
        response.end(
          JSON.stringify([
            {
              sha: "abc",
              author: { login: "gaon-kim" },
              commit: {
                message: "feat",
                author: { name: "김가온", email: "g@example.com", date: "2026-07-12T00:00:00Z" },
              },
            },
          ]),
        )
        return
      }
      response.statusCode = 500
      response.end(JSON.stringify({ message: "upstream failure" }))
    })

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("test server did not start")

    try {
      const result = await runGithubSync({
        configPath,
        participantsPath,
        snapshotPath,
        ledgerPath,
        reportPath,
        githubToken: "test-token",
        githubApiBaseUrl: `http://127.0.0.1:${address.port}`,
      })
      expect(result.ok).toBe(false)
      expect(result.report?.status).toBe("partial_success")
      expect(JSON.parse(fs.readFileSync(snapshotPath, "utf8"))).toEqual(previousSnapshot)
      expect(fs.readFileSync(ledgerPath, "utf8").trim().split("\n")).toHaveLength(1)
      expect(JSON.parse(fs.readFileSync(reportPath, "utf8"))).toMatchObject({
        status: "partial_success",
        reposSucceeded: 1,
        reposFailed: 1,
        commitsFetched: 1,
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  })
})

describe("config and KST week resolver", () => {
  it("includes exact KST boundaries", () => {
    expect(resolveCurrentWeek(config, new Date("2026-07-09T00:00:00.000Z"))).toBe(2)
    expect(resolveCurrentWeek(config, new Date("2026-07-15T23:59:59.000Z"))).toBe(2)
    expect(resolveCurrentWeek(config, new Date("2026-07-16T00:00:00.000Z"))).toBeNull()
  })

  it("supports current week override and skips disabled weeks", () => {
    expect(resolveCurrentWeek({ ...config, currentWeekOverride: 9 }, new Date("2026-01-01T00:00:00.000Z"))).toBe(9)
    expect(
      resolveCurrentWeek(
        { ...config, weeks: config.weeks.map((week) => ({ ...week, enabled: false })) },
        new Date("2026-07-09T00:00:00.000Z"),
      ),
    ).toBeNull()
  })

  it("rejects overlapping weeks", () => {
    expect(() =>
      AppConfigSchema.parse({
        ...config,
        weeks: [
          {
            week: 1,
            label: "1",
            startAt: "2026-07-02T09:00:00+09:00",
            endAt: "2026-07-10T09:00:00+09:00",
            enabled: true,
          },
          {
            week: 2,
            label: "2",
            startAt: "2026-07-09T09:00:00+09:00",
            endAt: "2026-07-16T09:00:00+09:00",
            enabled: true,
          },
        ],
      }),
    ).toThrow()
  })

  it("rejects duplicate week numbers and invalid week ranges", () => {
    expect(() =>
      AppConfigSchema.parse({
        ...config,
        weeks: [
          {
            week: 1,
            label: "1",
            startAt: "2026-07-02T09:00:00+09:00",
            endAt: "2026-07-02T08:59:59+09:00",
            enabled: true,
          },
          {
            week: 1,
            label: "duplicate",
            startAt: "2026-07-03T09:00:00+09:00",
            endAt: "2026-07-04T09:00:00+09:00",
            enabled: true,
          },
        ],
      }),
    ).toThrow()
  })

  it("writes validated config atomically", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "madcamp-config-"))
    const configPath = path.join(tmp, "madcamp.config.json")
    const written = writeConfig(config, configPath)
    expect(written.displayName).toBe(config.displayName)
    expect(JSON.parse(fs.readFileSync(configPath, "utf8")).githubOrg).toBe("madcamp")
  })
})

describe("repo discovery", () => {
  it("parses default naming rule", () => {
    expect(parseRepoName("26s-w2-c3-07", "2026-summer")).toEqual({
      season: "2026-summer",
      week: 2,
      class: 3,
      teamNumber: "07",
    })
    expect(parseRepoName("2026-w2-c3-07")).toBeNull()
    expect(parseRepoName("26x-w2-c3-07")).toBeNull()
    expect(parseRepoName("26s-w0-c3-07")).toBeNull()
    expect(parseRepoName("26s-w2-c0-07")).toBeNull()
    expect(parseRepoName("26s-w2-c3-07", "")).toBeNull()
    expect(parseRepoName("26s-w2-c3-07")?.season).toBe("2026-summer")
  })

  it("discovers only enabled season repos", () => {
    const result = discoverTrackedRepos(
      [
        {
          id: 1,
          name: "26s-w2-c3-07",
          html_url: "https://github.com/o/r",
          private: true,
          default_branch: "main",
        },
        { id: 2, name: "misc", html_url: "https://github.com/o/m", private: false, default_branch: "main" },
        {
          id: 3,
          name: "26s-w2-c5-01",
          html_url: "https://github.com/o/x",
          private: false,
          default_branch: "main",
        },
      ],
      config,
    )
    expect(result.trackedRepos).toHaveLength(1)
    expect(result.ignoredRepos).toContain("misc")
    expect(result.warnings.join(" ")).toContain("class exceeds")
  })

  it("warns and ignores disabled or unknown weeks", () => {
    const disabledConfig = AppConfigSchema.parse({
      ...config,
      weeks: config.weeks.map((week) => (week.week === 2 ? { ...week, enabled: false } : week)),
    })
    const result = discoverTrackedRepos(
      [
        {
          id: 1,
          name: "26s-w2-c3-07",
          html_url: "https://github.com/o/r",
          private: true,
          default_branch: "main",
        },
      ],
      disabledConfig,
    )
    expect(result.trackedRepos).toHaveLength(0)
    expect(result.ignoredRepos).toEqual(["26s-w2-c3-07"])
    expect(result.warnings.join(" ")).toContain("disabled or unknown week")
  })
})

describe("participants and author mapping", () => {
  it("validates CSV, BOM, duplicate usernames, aliases, and Korean names", () => {
    const parsed = parseParticipantsCsv(
      '\uFEFFname,identifier,class,aliases,note\n"김,가온",Gaon-Kim,3,gaon,"a ""quote"""',
    )
    expect(parsed.participants[0]?.githubUsername).toBe("gaon-kim")
    expect(parsed.participants[0]?.identifier).toBe("gaon-kim")
    expect(parsed.participants[0]?.identifierType).toBe("github")
    expect(parsed.participants[0]?.name).toBe("김,가온")
    expect(parsed.warnings).toEqual(["unknown column ignored: note"])
    expect(() => parseParticipantsCsv("name,identifier\nA,a\nB,A")).toThrow(/duplicate/)
    expect(() => parseParticipantsCsv("name,identifier\nNoUser,")).toThrow(/identifier is required/)
    expect(parseParticipantsCsv("name,identifier,email,class\nNoClass,noclass").participants[0]?.class).toBeUndefined()
    expect(parseParticipantsCsv("name,identifier\nEmail,email@example.com").participants[0]).toMatchObject({
      identifier: "email@example.com",
      identifierType: "email",
      email: "email@example.com",
    })
    expect(parseParticipantsCsv("name,github,email\nFallback,,fallback@example.com").participants[0]).toMatchObject({
      identifier: "fallback@example.com",
      identifierType: "email",
      email: "fallback@example.com",
    })
    expect(
      parseParticipantsCsv("name,github_or_email,email\nGitHub,GitHubID,g@example.com").participants[0],
    ).toMatchObject({
      identifier: "githubid",
      identifierType: "github",
      githubUsername: "githubid",
      email: "g@example.com",
    })
    expect(parseParticipantsCsv("name,github_username\nLegacy,legacy-id").participants[0]?.githubUsername).toBe(
      "legacy-id",
    )
    expect(parseParticipantsCsv("name,identifier\nSame,a\nsame,b").warnings).toContain("duplicate name: same")
    expect(() => parseParticipantsCsv("identifier\na")).toThrow(/missing required column: name/)
    expect(() => parseParticipantsCsv("name\nA")).toThrow(/missing required column: identifier/)
    expect(() => parseParticipantsCsv("name,identifier\n,abc")).toThrow(/name is required/)
    expect(() => parseParticipantsCsv("name,identifier\nBad,-bad-")).toThrow(/invalid GitHub identifier/)
  })

  it("maps login and known bots", () => {
    const { participants } = parseParticipantsCsv(
      "participant_id,name,identifier,class\np1,김가온,gaon-kim,3\np2,이메일,email@example.com,2",
    )
    expect(mapCommitAuthor({ login: "Gaon-Kim" }, participants).participantId).toBe("p1")
    expect(mapCommitAuthor({ login: "gaon" }, [{ ...participants[0]!, aliases: ["gaon"] }]).participantId).toBe("p1")
    expect(mapCommitAuthor({ email: "EMAIL@example.com" }, participants).participantId).toBe("p2")
    expect(mapCommitAuthor({ login: "dependabot[bot]" }, participants).unknownReason).toBe("bot")
    expect(mapCommitAuthor({ login: "external-dev" }, participants).unknownReason).toBe("not_in_participants_csv")
    expect(mapCommitAuthor({}, participants).unknownReason).toBe("missing_author")
  })

  it("parses co-author trailers and attributes AI bot commits to matched participants", () => {
    const { participants } = parseParticipantsCsv(
      "participant_id,name,identifier,class\np1,박지민,jshskaist31,1\np2,김철수,kimcs@example.com,1",
    )
    const message = "fix: update sync\n\nCo-authored-by: 김철수 <kimcs@example.com>"
    expect(parseCoAuthors(message)).toEqual([{ name: "김철수", email: "kimcs@example.com" }])

    const botWithParticipant = analyzeCommitAttribution(
      {
        author: { login: "codex[bot]", email: "bot@openai.com" },
        committer: { login: "codex[bot]" },
        message,
      },
      participants,
    )
    expect(botWithParticipant.attributionStatus).toBe("bot_with_participant")
    expect(botWithParticipant.detectedBots).toContain("codex[bot]")
    expect(botWithParticipant.matchedParticipants).toEqual([{ participantId: "p2", matchSource: "coauthor_email" }])

    const botOnly = analyzeCommitAttribution(
      { author: { login: "claude-code[bot]", email: "noreply@anthropic.com" }, message: "feat: generated page" },
      participants,
    )
    expect(botOnly.attributionStatus).toBe("bot_only")
    expect(botOnly.unknownReason).toBe("bot")

    const multipleParticipants = analyzeCommitAttribution(
      {
        author: { login: "jshskaist31" },
        message,
      },
      participants,
    )
    expect(multipleParticipants.attributionStatus).toBe("multiple_participants")
    expect(multipleParticipants.matchedParticipants.map((match) => match.participantId)).toEqual(["p1", "p2"])

    const dedupedParticipant = analyzeCommitAttribution(
      {
        author: { login: "jshskaist31", email: "jshskaist31@example.com" },
      },
      [{ ...participants[0]!, email: "jshskaist31@example.com" }],
    )
    expect(dedupedParticipant.matchedParticipants).toEqual([{ participantId: "p1", matchSource: "author_login" }])

    const namedBot = analyzeCommitAttribution({ author: { name: "Cursor Agent" }, message: "chore" }, participants)
    expect(namedBot.detectedBots).toEqual(["Cursor Agent"])
  })

  it("normalizes invalid usernames to an empty value", () => {
    expect(normalizeGithubUsername(" Gaon-Kim ")).toBe("gaon-kim")
    expect(() =>
      ParticipantSchema.parse({
        participantId: "p",
        name: "P",
        identifier: "-bad-",
        identifierType: "github",
        githubUsername: "-bad-",
        aliases: [],
      }),
    ).toThrow()
  })
})

describe("aggregation", () => {
  const commits: CommitRecord[] = [
    {
      sha: "a",
      repoName: "2026-summer-w2-c3-07",
      week: 2,
      class: 3,
      teamNumber: "07",
      participantId: "p1",
      authorGithubUsername: "gaon-kim",
      committedAt: "2026-07-12T00:00:00.000Z",
    },
    {
      sha: "a",
      repoName: "2026-summer-w2-c3-07",
      week: 2,
      class: 3,
      teamNumber: "07",
      participantId: "p1",
      authorGithubUsername: "gaon-kim",
      committedAt: "2026-07-12T00:00:00.000Z",
    },
    {
      sha: "b",
      repoName: "2026-summer-w2-c3-07",
      week: 2,
      class: 3,
      teamNumber: "07",
      committedAt: "2026-07-12T01:00:00.000Z",
    },
  ]

  it("deduplicates by repo and SHA", () => {
    expect(dedupeCommits(commits)).toHaveLength(2)
  })

  it("handles empty commit snapshots without weekly honors", () => {
    const { participants } = parseParticipantsCsv("participant_id,name,identifier,class\np1,김가온,gaon-kim,3")
    const snapshot = aggregateSnapshot({
      season: "2026-summer",
      currentWeek: null,
      participants,
      commits: [],
    })
    expect(snapshot.summary.totalCommits).toBe(0)
    expect(snapshot.rankings.personal).toEqual([])
    expect(snapshot.rankings.teams).toEqual([])
    expect(snapshot.rankings.classes).toEqual([])
  })

  it("computes KST day and hour streak statistics", () => {
    const streakCommits: CommitRecord[] = [
      {
        sha: "s1",
        repoName: "2026-summer-w2-c1-01",
        week: 2,
        class: 1,
        teamNumber: "01",
        participantId: "p1",
        committedAt: "2026-07-10T23:00:00+09:00",
      },
      {
        sha: "s2",
        repoName: "2026-summer-w2-c1-01",
        week: 2,
        class: 1,
        teamNumber: "01",
        participantId: "p1",
        committedAt: "2026-07-11T00:00:00+09:00",
      },
      {
        sha: "s3",
        repoName: "2026-summer-w2-c1-01",
        week: 2,
        class: 1,
        teamNumber: "01",
        participantId: "p1",
        committedAt: "2026-07-11T01:00:00+09:00",
      },
      {
        sha: "s4",
        repoName: "2026-summer-w2-c1-01",
        week: 2,
        class: 1,
        teamNumber: "01",
        participantId: "p1",
        committedAt: "2026-07-12T01:30:00+09:00",
      },
    ]
    expect(activityStatsForCommits([])).toEqual({
      currentDayStreak: 0,
      longestDayStreak: 0,
      currentHourStreak: 0,
      longestHourStreak: 0,
      activeHours: 0,
    })
    expect(activityStatsForCommits(streakCommits, new Date("2026-07-12T01:45:00+09:00"))).toEqual({
      currentDayStreak: 3,
      longestDayStreak: 3,
      currentHourStreak: 1,
      longestHourStreak: 3,
      activeHours: 4,
    })
    // once the person stops committing, the "current" streak breaks even though longest is unchanged
    expect(activityStatsForCommits(streakCommits, new Date("2026-07-14T09:00:00+09:00"))).toEqual({
      currentDayStreak: 0,
      longestDayStreak: 3,
      currentHourStreak: 0,
      longestHourStreak: 3,
      activeHours: 4,
    })
  })

  it("excludes unknown users from personal ranking but keeps team totals", () => {
    const { participants } = parseParticipantsCsv("participant_id,name,identifier,class\np1,김가온,gaon-kim,3")
    const snapshot = aggregateSnapshot({
      season: "2026-summer",
      currentWeek: 2,
      participants,
      commits: [
        ...commits,
        {
          sha: "c",
          repoName: "2026-summer-w2-c3-07",
          week: 2,
          class: 3,
          teamNumber: "07",
          participantId: "unknown-participant",
          authorName: "Unknown Name",
          committedAt: "2026-07-11T23:59:59.000Z",
          messageSummary: "<script>alert(1)</script>",
        },
        {
          sha: "d",
          repoName: "2026-summer-w2-c1-01",
          week: 2,
          class: 1,
          teamNumber: "01",
          authorGithubUsername: "alpha",
          committedAt: "2026-07-10T00:00:00.000Z",
        },
        {
          sha: "e",
          repoName: "2026-summer-w2-c3-07",
          week: 2,
          class: 3,
          teamNumber: "07",
          committedAt: "2026-07-12T02:00:00.000Z",
          matchedParticipants: [
            { participantId: "p1", matchSource: "author_login" },
            { participantId: "p2", matchSource: "coauthor_email" },
          ],
          coAuthors: [{ name: "Co", email: "co@example.com" }],
          attributionStatus: "multiple_participants",
        },
      ],
      unknownUsers: [
        {
          repoName: "r",
          sha: "x",
          committedAt: "2026-01-01T00:00:00.000Z",
          reason: "not_in_participants_csv",
        },
      ],
    })
    expect(snapshot.summary.totalCommits).toBe(5)
    expect(snapshot.summary.mappedCommits).toBe(3)
    // personal[0] is no longer necessarily the highest raw commit count -- ranking now sorts by
    // score, so look up 김가온 (p1) directly to confirm the underlying commit count is still correct.
    expect(snapshot.rankings.personal.find((entry) => entry.label === "김가온")?.commits).toBe(2)
    expect(snapshot.rankings.personal.some((entry) => entry.label === "unknown-participant")).toBe(true)
    expect(snapshot.rankings.teams.find((entry) => entry.id === "2026-summer-w2-c3-07")?.commits).toBe(4)
    // classes now rank by average score too, so look up the specific class rather than assume position 0
    expect(snapshot.rankings.classes.find((entry) => entry.id === "3")?.averagePerPerson).toBe(4)
    expect(snapshot.activityFeed[0]?.summary).not.toContain("<")
    expect(snapshot.heatmap.map((item) => item.date)).toEqual([...snapshot.heatmap.map((item) => item.date)].sort())
    expect(snapshot.unknownUsers).toHaveLength(1)
  })
})

describe("admin session and persistence helpers", () => {
  it("validates admin session signatures and cookie options", () => {
    const previous = process.env.ADMIN_TOKEN
    process.env.ADMIN_TOKEN = "secret"
    try {
      const signature = getAdminSessionSignature()
      expect(signature).toHaveLength(64)
      expect(isValidAdminSession(signature)).toBe(true)
      expect(isValidAdminSession(`${signature}x`)).toBe(false)
      expect(isValidAdminSession("bad")).toBe(false)
      expect(isValidAdminSession(undefined)).toBe(false)
      expect(adminSessionCookieOptions()).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" })
    } finally {
      process.env.ADMIN_TOKEN = previous
    }
  })

  it("returns null signature without a token", () => {
    const previous = process.env.ADMIN_TOKEN
    delete process.env.ADMIN_TOKEN
    try {
      expect(getAdminSessionSignature()).toBeNull()
      expect(isValidAdminSession("x")).toBe(false)
    } finally {
      process.env.ADMIN_TOKEN = previous
    }
  })

  it("reads and writes snapshot fallback and sync state", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "madcamp-state-"))
    const snapshotPath = path.join(tmp, "latest.json")
    const statePath = path.join(tmp, "sync-state.json")

    expect(readSnapshotFallback(snapshotPath, { ok: false })).toEqual({ ok: false })
    writeSnapshotSafely(snapshotPath, { ok: true })
    expect(readSnapshotFallback(snapshotPath, { ok: false })).toEqual({ ok: true })

    expect(readSyncState(statePath)).toEqual({ repos: {} })
    writeSyncState({ repos: { repo: { lastSeenSha: "abc", lastSyncedAt: "now" } } }, statePath)
    expect(readSyncState(statePath).repos.repo?.lastSeenSha).toBe("abc")
  })
})

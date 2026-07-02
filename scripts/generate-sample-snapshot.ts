import fs from "node:fs"
import { aggregateSnapshot } from "../src/aggregation/aggregate"
import type { CommitRecord, UnknownUser } from "../src/aggregation/types"
import { parseParticipantsCsv } from "../src/participants/parse-participants"
import { loadConfig } from "../src/config/load-config"
import { resolveCurrentWeek } from "../src/config/schema"
import { writeSnapshotSafely } from "../src/snapshot/fallback"

const config = loadConfig()
const { participants } = parseParticipantsCsv(fs.readFileSync("src/participants/participants.csv", "utf8"))

function commitUrl(repoName: string, sha: string): string {
  return `https://github.com/${config.githubOrg}/${repoName}/commit/${sha}`
}

const commits: CommitRecord[] = [
  {
    sha: "a1",
    repoName: "2026-summer-w2-c3-07",
    week: 2,
    class: 3,
    teamNumber: "07",
    authorGithubUsername: "gaon-kim",
    participantId: "p001",
    committedAt: "2026-07-12T09:25:00.000Z",
    messageSummary: "dashboard polish",
    commitUrl: commitUrl("2026-summer-w2-c3-07", "a1"),
  },
  {
    sha: "a2",
    repoName: "2026-summer-w2-c3-07",
    week: 2,
    class: 3,
    teamNumber: "07",
    authorGithubUsername: "gaon-kim",
    participantId: "p001",
    committedAt: "2026-07-11T09:25:00.000Z",
    messageSummary: "heatmap tooltip",
    commitUrl: commitUrl("2026-summer-w2-c3-07", "a2"),
  },
  {
    sha: "a3",
    repoName: "2026-summer-w2-c3-07",
    week: 2,
    class: 3,
    teamNumber: "07",
    authorGithubUsername: "chaewon-yoon",
    participantId: "p004",
    committedAt: "2026-07-11T11:25:00.000Z",
    messageSummary: "ranking row motion",
    commitUrl: commitUrl("2026-summer-w2-c3-07", "a3"),
  },
  {
    sha: "a4",
    repoName: "2026-summer-w2-c3-07",
    week: 2,
    class: 3,
    teamNumber: "07",
    authorGithubUsername: "external-dev",
    committedAt: "2026-07-12T08:00:00.000Z",
    messageSummary: "external commit",
    commitUrl: commitUrl("2026-summer-w2-c3-07", "a4"),
  },
  {
    sha: "b1",
    repoName: "2026-summer-w2-c1-03",
    week: 2,
    class: 1,
    teamNumber: "03",
    authorGithubUsername: "seojun-lee",
    participantId: "p002",
    committedAt: "2026-07-12T06:00:00.000Z",
    messageSummary: "fix auth flow",
    commitUrl: commitUrl("2026-summer-w2-c1-03", "b1"),
  },
  {
    sha: "b2",
    repoName: "2026-summer-w2-c1-03",
    week: 2,
    class: 1,
    teamNumber: "03",
    authorGithubUsername: "seojun-lee",
    participantId: "p002",
    committedAt: "2026-07-12T06:05:00.000Z",
    messageSummary: "fix: improve login flow",
    commitUrl: commitUrl("2026-summer-w2-c1-03", "b2"),
  },
  {
    sha: "c1",
    repoName: "2026-summer-w2-c2-05",
    week: 2,
    class: 2,
    teamNumber: "05",
    authorGithubUsername: "harin-park",
    participantId: "p003",
    committedAt: "2026-07-11T12:10:00.000Z",
    messageSummary: "test: add input validation cases",
    commitUrl: commitUrl("2026-summer-w2-c2-05", "c1"),
  },
  {
    sha: "c2",
    repoName: "2026-summer-w2-c2-05",
    week: 2,
    class: 2,
    teamNumber: "05",
    authorGithubUsername: "harin-park",
    participantId: "p003",
    committedAt: "2026-07-11T12:20:00.000Z",
    messageSummary: "refactor: simplify ranking data",
    commitUrl: commitUrl("2026-summer-w2-c2-05", "c2"),
  },
]

const unknownUsers: UnknownUser[] = [
  {
    repoName: "2026-summer-w2-c3-07",
    sha: "a4",
    authorLogin: "external-dev",
    committedAt: "2026-07-12T08:00:00.000Z",
    reason: "not_in_participants_csv",
  },
]

const snapshot = aggregateSnapshot({
  season: config.season,
  currentWeek: resolveCurrentWeek(config, new Date("2026-07-12T09:30:00.000Z")),
  participants,
  commits,
  unknownUsers,
})

fs.mkdirSync("public/data/snapshots", { recursive: true })
writeSnapshotSafely("public/data/snapshots/latest.json", snapshot)
writeSnapshotSafely(`public/data/snapshots/${config.season}-w2.json`, snapshot)

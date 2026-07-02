import fs from "node:fs"
import path from "node:path"
import { aggregateSnapshot, dedupeCommits, type AggregatedSnapshot } from "../aggregation/aggregate"
import type { CommitRecord, UnknownUser } from "../aggregation/types"
import { loadConfig } from "../config/load-config"
import { resolveCurrentWeek, type AppConfig, type WeekConfig } from "../config/schema"
import { GitHubClient, type GitHubCommitSummary } from "../github/client"
import { discoverTrackedRepos, type DiscoveryResult, type TrackedRepo } from "../github/discover-repos"
import { parseParticipantsCsv } from "../participants/parse-participants"
import type { Participant } from "../participants/participant-schema"
import { writeSnapshotSafely } from "../snapshot/fallback"
import { analyzeCommitAttribution } from "./map-commit-author"
import { readSyncState, writeSyncState } from "./sync-state"

export interface SyncRunnerOptions {
  week?: number
  dryRun?: boolean
  configPath?: string
  participantsPath?: string
  snapshotPath?: string
  ledgerPath?: string
  reportPath?: string
  githubToken?: string
  githubApiBaseUrl?: string
}

export interface RepoSyncReport {
  repoName: string
  week: number
  status: "success" | "failed"
  commitScope: AppConfig["commitScope"]
  branchesScanned: number
  branchesFetched: number
  pagesFetched: number
  commitsFetched: number
  firstCommitAt?: string
  lastCommitAt?: string
  reason?: string
}

export interface SyncReport {
  syncStartedAt: string
  syncFinishedAt: string
  durationMs: number
  week: number | null
  status: "success" | "partial_success" | "failed"
  commitScope: AppConfig["commitScope"]
  reposExpected: number
  reposMatched: number
  reposSucceeded: number
  reposFailed: number
  branchesScanned: number
  commitPagesFetched: number
  commitsFetched: number
  uniqueCommits: number
  unknownAuthors: number
  rateLimit: ReturnType<GitHubClient["getRateLimit"]>
  failedRepos: Array<{ repoName: string; reason: string }>
  repoReports: RepoSyncReport[]
  warnings: string[]
  attribution: {
    participantCommits: number
    coAuthoredParticipantCommits: number
    botWithParticipant: number
    botOnly: number
    unknown: number
  }
}

export interface SyncRunResult {
  ok: boolean
  dryRun: boolean
  discovery: DiscoveryResult
  commitsProcessed: number
  unknownUsers: number
  failedRepos: Array<{ repoName: string; reason: string }>
  rateLimit: ReturnType<GitHubClient["getRateLimit"]>
  report?: SyncReport
  ledgerPath?: string
  reportPath?: string
  snapshotPath?: string
}

export async function runGithubSync(options: SyncRunnerOptions = {}): Promise<SyncRunResult> {
  const syncStartedAt = new Date()
  const config = loadConfig(options.configPath)
  const participants = loadParticipants(options.participantsPath)
  const token = options.githubToken ?? process.env.GITHUB_TOKEN

  if (!token) {
    throw new Error("GITHUB_TOKEN is required for GitHub sync")
  }

  const client = new GitHubClient({ token, apiBaseUrl: options.githubApiBaseUrl })
  const repos = await client.listOrgRepos(config.githubOrg)
  const discovery = discoverTrackedRepos(repos, config)
  const selectedRepos = discovery.trackedRepos.filter((repo) => (options.week ? repo.week === options.week : true))

  if (options.dryRun) {
    await client.fetchRateLimit().catch(() => client.getRateLimit())
    return {
      ok: true,
      dryRun: true,
      discovery: { ...discovery, trackedRepos: selectedRepos },
      commitsProcessed: 0,
      unknownUsers: 0,
      failedRepos: [],
      rateLimit: client.getRateLimit(),
    }
  }

  const state = readSyncState()
  const commits: CommitRecord[] = []
  const unknownUsers: UnknownUser[] = []
  const failedRepos: Array<{ repoName: string; reason: string }> = []
  const repoReports: RepoSyncReport[] = []

  for (const repo of selectedRepos) {
    const week = weekForRepo(config, repo)
    if (!week) continue
    try {
      const fetched = await fetchRepoCommits({
        client,
        config,
        repo,
        week,
      })
      for (const commit of fetched.values) {
        const mapped = toCommitRecord(commit.value, repo, participants, commit.branch)
        commits.push(mapped.record)
        if (mapped.unknownUser) unknownUsers.push(mapped.unknownUser)
      }
      const commitTimes = fetched.values
        .map((commit) => commit.value.commit.author?.date ?? commit.value.commit.committer?.date)
        .filter(Boolean)
        .sort() as string[]
      repoReports.push({
        repoName: repo.name,
        week: repo.week,
        status: "success",
        commitScope: config.commitScope,
        branchesScanned: fetched.branchesScanned,
        branchesFetched: fetched.branchesFetched,
        pagesFetched: fetched.pagesFetched,
        commitsFetched: fetched.values.length,
        firstCommitAt: commitTimes[0],
        lastCommitAt: commitTimes.at(-1),
      })
      state.repos[repo.name] = {
        lastSyncedAt: new Date().toISOString(),
        lastSeenSha: fetched.values[0]?.value.sha ?? state.repos[repo.name]?.lastSeenSha,
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      failedRepos.push({ repoName: repo.name, reason })
      repoReports.push({
        repoName: repo.name,
        week: repo.week,
        status: "failed",
        commitScope: config.commitScope,
        branchesScanned: 0,
        branchesFetched: 0,
        pagesFetched: 0,
        commitsFetched: 0,
        reason,
      })
    }
  }

  const currentWeek = options.week ?? resolveCurrentWeek(config)
  const snapshotPath = options.snapshotPath ?? path.join(process.cwd(), "public", "data", "snapshots", "latest.json")
  const ledgerPath =
    options.ledgerPath ?? path.join(process.cwd(), "data", "commits", `${config.season}-w${currentWeek ?? "all"}.jsonl`)
  const reportPath = options.reportPath ?? path.join(process.cwd(), "data", "sync-reports", "latest.json")
  const uniqueCommits = dedupeCommits(commits)
  await enrichCommitStats(client, config.githubOrg, uniqueCommits, readPreviousLedger(ledgerPath))
  writeCommitLedgerSafely(ledgerPath, uniqueCommits)

  const report = buildSyncReport({
    syncStartedAt,
    week: currentWeek,
    selectedRepos,
    commits,
    uniqueCommits,
    unknownUsers,
    failedRepos,
    repoReports,
    discovery,
    rateLimit: client.getRateLimit(),
  })
  writeJsonSafely(reportPath, report)

  if (report.status === "failed" || failedRepos.length > 0) {
    writeSyncFailureSummary(snapshotPath, report)
    writeSyncState(state)
    return {
      ok: false,
      dryRun: false,
      discovery: { ...discovery, trackedRepos: selectedRepos },
      commitsProcessed: uniqueCommits.length,
      unknownUsers: unknownUsers.length,
      failedRepos,
      rateLimit: client.getRateLimit(),
      report,
      ledgerPath,
      reportPath,
      snapshotPath,
    }
  }

  const weekEnded = Boolean(
    currentWeek && config.weeks.find((week) => week.week === currentWeek && Date.now() > Date.parse(week.endAt)),
  )

  const snapshot = aggregateSnapshot({
    season: config.season,
    currentWeek,
    participants,
    commits: uniqueCommits,
    unknownUsers,
    previousSnapshot: readPreviousSnapshot(snapshotPath),
    weekEnded,
  })
  writeSnapshotSafely(snapshotPath, {
    ...snapshot,
    sync: {
      status: failedRepos.length ? "partial" : "ok",
      failedRepos,
      rateLimit: client.getRateLimit(),
      reposScanned: selectedRepos.length,
      commitsProcessed: uniqueCommits.length,
    },
  })
  if (currentWeek) {
    writeSnapshotSafely(path.join(path.dirname(snapshotPath), `${config.season}-w${currentWeek}.json`), snapshot)
  }
  writeSyncState(state)

  return {
    ok: failedRepos.length === 0,
    dryRun: false,
    discovery: { ...discovery, trackedRepos: selectedRepos },
    commitsProcessed: uniqueCommits.length,
    unknownUsers: unknownUsers.length,
    failedRepos,
    rateLimit: client.getRateLimit(),
    report,
    ledgerPath,
    reportPath,
    snapshotPath,
  }
}

async function fetchRepoCommits(params: {
  client: GitHubClient
  config: AppConfig
  repo: TrackedRepo
  week: WeekConfig
}): Promise<{
  values: Array<{ branch: string; value: GitHubCommitSummary }>
  branchesScanned: number
  branchesFetched: number
  pagesFetched: number
}> {
  const since = new Date(params.week.startAt).toISOString()
  const until = new Date(params.week.endAt).toISOString()
  const branches =
    params.config.commitScope === "all_branches"
      ? await params.client.listBranchesWithMeta({ owner: params.config.githubOrg, repo: params.repo.name })
      : { values: [{ name: params.repo.defaultBranch }], pagesFetched: 0 }

  const values: Array<{ branch: string; value: GitHubCommitSummary }> = []
  let commitPagesFetched = 0
  for (const branch of branches.values) {
    const fetched = await params.client.listCommitsWithMeta({
      owner: params.config.githubOrg,
      repo: params.repo.name,
      sha: branch.name,
      since,
      until,
    })
    commitPagesFetched += fetched.pagesFetched
    values.push(...fetched.values.map((value) => ({ branch: branch.name, value })))
  }
  return {
    values,
    branchesScanned: branches.values.length,
    branchesFetched: branches.pagesFetched,
    pagesFetched: commitPagesFetched,
  }
}

function readPreviousLedger(ledgerPath: string): Map<string, CommitRecord> {
  const map = new Map<string, CommitRecord>()
  try {
    const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean)
    for (const line of lines) {
      const record = JSON.parse(line) as CommitRecord
      map.set(record.sha, record)
    }
  } catch {
    // no previous ledger yet
  }
  return map
}

async function enrichCommitStats(
  client: GitHubClient,
  owner: string,
  commits: CommitRecord[],
  previousLedger: Map<string, CommitRecord>,
): Promise<void> {
  for (const commit of commits) {
    const cached = previousLedger.get(commit.sha)
    if (cached?.additions !== undefined) {
      commit.additions = cached.additions
      commit.deletions = cached.deletions
      commit.changedFiles = cached.changedFiles
      continue
    }
    try {
      const detail = await client.getCommit({ owner, repo: commit.repoName, ref: commit.sha })
      commit.additions = detail.stats?.additions ?? 0
      commit.deletions = detail.stats?.deletions ?? 0
      commit.changedFiles = detail.files?.length ?? 0
    } catch {
      // leave stats undefined if the detail fetch fails; not fatal to the sync
    }
  }
}

function readPreviousSnapshot(snapshotPath: string): AggregatedSnapshot | undefined {
  try {
    return JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as AggregatedSnapshot
  } catch {
    return undefined
  }
}

function writeSyncFailureSummary(snapshotPath: string, summary: unknown) {
  const failurePath = path.join(path.dirname(snapshotPath), "last-sync-failure.json")
  fs.mkdirSync(path.dirname(failurePath), { recursive: true })
  fs.writeFileSync(failurePath, `${JSON.stringify(summary, null, 2)}\n`)
}

function writeCommitLedgerSafely(ledgerPath: string, commits: CommitRecord[]) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true })
  const next = `${ledgerPath}.next`
  fs.writeFileSync(next, commits.map((commit) => JSON.stringify(commit)).join("\n") + (commits.length ? "\n" : ""))
  fs.renameSync(next, ledgerPath)
}

function writeJsonSafely(pathname: string, json: unknown) {
  fs.mkdirSync(path.dirname(pathname), { recursive: true })
  const next = `${pathname}.next`
  fs.writeFileSync(next, `${JSON.stringify(json, null, 2)}\n`)
  fs.renameSync(next, pathname)
}

function buildSyncReport(params: {
  syncStartedAt: Date
  week: number | null
  selectedRepos: TrackedRepo[]
  commits: CommitRecord[]
  uniqueCommits: CommitRecord[]
  unknownUsers: UnknownUser[]
  failedRepos: Array<{ repoName: string; reason: string }>
  repoReports: RepoSyncReport[]
  discovery: DiscoveryResult
  rateLimit: ReturnType<GitHubClient["getRateLimit"]>
}): SyncReport {
  const syncFinishedAt = new Date()
  const reposFailed = params.failedRepos.length
  const hasIntegrityWarning = reposFailed > 0 || params.unknownUsers.length > 0 || params.discovery.warnings.length > 0
  return {
    syncStartedAt: params.syncStartedAt.toISOString(),
    syncFinishedAt: syncFinishedAt.toISOString(),
    durationMs: syncFinishedAt.getTime() - params.syncStartedAt.getTime(),
    week: params.week,
    status:
      reposFailed === params.selectedRepos.length && params.selectedRepos.length > 0
        ? "failed"
        : hasIntegrityWarning
          ? "partial_success"
          : "success",
    commitScope: params.repoReports[0]?.commitScope ?? "all_branches",
    reposExpected: params.selectedRepos.length,
    reposMatched: params.selectedRepos.length,
    reposSucceeded: params.repoReports.filter((repo) => repo.status === "success").length,
    reposFailed,
    branchesScanned: params.repoReports.reduce((sum, repo) => sum + repo.branchesScanned, 0),
    commitPagesFetched: params.repoReports.reduce((sum, repo) => sum + repo.pagesFetched, 0),
    commitsFetched: params.commits.length,
    uniqueCommits: params.uniqueCommits.length,
    unknownAuthors: params.unknownUsers.length,
    rateLimit: params.rateLimit,
    failedRepos: params.failedRepos,
    repoReports: params.repoReports,
    warnings: params.discovery.warnings,
    attribution: {
      participantCommits: params.uniqueCommits.filter((commit) => participantIdsForCommit(commit).length > 0).length,
      coAuthoredParticipantCommits: params.uniqueCommits.filter(
        (commit) => (commit.coAuthors?.length ?? 0) > 0 && participantIdsForCommit(commit).length > 0,
      ).length,
      botWithParticipant: params.uniqueCommits.filter((commit) => commit.attributionStatus === "bot_with_participant")
        .length,
      botOnly: params.uniqueCommits.filter((commit) => commit.attributionStatus === "bot_only").length,
      unknown: params.uniqueCommits.filter((commit) => commit.attributionStatus === "unknown").length,
    },
  }
}

function loadParticipants(
  participantsPath = path.join(process.cwd(), "src", "participants", "participants.csv"),
) {
  return parseParticipantsCsv(fs.readFileSync(participantsPath, "utf8")).participants
}

function weekForRepo(config: AppConfig, repo: TrackedRepo): WeekConfig | undefined {
  return config.weeks.find((week) => week.week === repo.week && week.enabled)
}

function toCommitRecord(commit: GitHubCommitSummary, repo: TrackedRepo, participants: Participant[], branch: string) {
  const author = {
    login: commit.author?.login,
    name: commit.commit.author?.name,
    email: commit.commit.author?.email,
  }
  const committer = {
    login: commit.committer?.login,
    name: commit.commit.committer?.name,
    email: commit.commit.committer?.email,
  }
  const attribution = analyzeCommitAttribution({ author, committer, message: commit.commit.message }, participants)
  const committedAt = commit.commit.author?.date ?? commit.commit.committer?.date ?? new Date().toISOString()
  const record: CommitRecord = {
    sha: commit.sha,
    repoName: repo.name,
    sourceBranches: [branch],
    week: repo.week,
    class: repo.class,
    teamNumber: repo.teamNumber,
    authorGithubUsername: attribution.primaryGithubUsername,
    authorEmail: author.email ?? undefined,
    authorName: author.name ?? undefined,
    committerGithubUsername: committer.login ?? undefined,
    committerEmail: committer.email ?? undefined,
    committerName: committer.name ?? undefined,
    coAuthors: attribution.coAuthors,
    detectedBots: attribution.detectedBots,
    matchedParticipants: attribution.matchedParticipants,
    attributionStatus: attribution.attributionStatus,
    participantId: attribution.matchedParticipants[0]?.participantId,
    committedAt,
    messageSummary: commit.commit.message?.split("\n")[0]?.slice(0, 100),
    commitUrl: commit.html_url,
  }
  const unknownUser: UnknownUser | undefined = attribution.unknownReason
    ? {
        repoName: repo.name,
        sha: commit.sha,
        authorLogin: attribution.primaryGithubUsername,
        authorEmail: author.email ?? undefined,
        authorName: author.name ?? undefined,
        committedAt,
        reason: attribution.unknownReason,
      }
    : undefined
  return { record, unknownUser }
}

function participantIdsForCommit(commit: CommitRecord): string[] {
  return [
    ...new Set(
      commit.matchedParticipants?.map((match) => match.participantId) ??
        (commit.participantId ? [commit.participantId] : []),
    ),
  ]
}

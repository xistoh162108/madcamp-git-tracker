import fs from "node:fs"
import path from "node:path"
import { GitHubClient } from "../src/github/client"
import { classifyCommit } from "../src/scoring/classify-commit"
import { commitScore, isQualifiedCommit } from "../src/scoring/commit-score"
import type { CommitKind, CommitRecord } from "../src/aggregation/types"
import { loadConfig } from "../src/config/load-config"

const args = process.argv.slice(2)
const flags = new Set(args)
const reportOnly = flags.has("--report-only")
const force = flags.has("--force")
const rateLimitFloor = 200
const progressInterval = 10

function commitsDir(): string {
  return path.join(process.cwd(), "data", "commits")
}

function ledgerFiles(): string[] {
  const dir = commitsDir()
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => path.join(dir, name))
}

function readLedger(ledgerPath: string): CommitRecord[] {
  const raw = fs.readFileSync(ledgerPath, "utf8")
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as CommitRecord)
}

function writeLedgerSafely(ledgerPath: string, commits: CommitRecord[]) {
  const next = `${ledgerPath}.next`
  fs.writeFileSync(next, commits.map((commit) => JSON.stringify(commit)).join("\n") + (commits.length ? "\n" : ""))
  fs.renameSync(next, ledgerPath)
}

function printDistributionReport(allCommits: CommitRecord[]) {
  const total = allCommits.length
  const classified = allCommits.filter((c) => c.commitKind !== undefined)
  const kindCounts = new Map<CommitKind | "unclassified", number>()
  for (const commit of allCommits) {
    const key = commit.commitKind ?? "unclassified"
    kindCounts.set(key, (kindCounts.get(key) ?? 0) + 1)
  }

  console.log(`\n=== commitKind distribution (${total} total commits) ===`)
  for (const [kind, count] of [...kindCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kind.padEnd(20)} ${count}`)
  }

  if (classified.length > 0) {
    const qualified = classified.filter(isQualifiedCommit)
    const scores = classified.map(commitScore)
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length
    console.log(`\n=== score summary (${classified.length} classified) ===`)
    console.log(`  qualified commits: ${qualified.length} / ${classified.length}`)
    console.log(`  avg commit_score:  ${avgScore.toFixed(3)}`)
  }
}

async function main() {
  const config = loadConfig()
  const files = ledgerFiles()
  if (files.length === 0) {
    console.log("no ledger files found under data/commits/")
    return
  }

  if (reportOnly) {
    const allCommits = files.flatMap(readLedger)
    printDistributionReport(allCommits)
    return
  }

  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN is required for backfill")
  const client = new GitHubClient({ token })

  const rateLimit = await client.fetchRateLimit()
  console.log(`rate limit: ${rateLimit.remaining ?? "?"} / ${rateLimit.limit ?? "?"} remaining`)

  let processed = 0
  let skipped = 0
  let failed = 0

  for (const ledgerPath of files) {
    const commits = readLedger(ledgerPath)
    let dirty = false

    for (const commit of commits) {
      if (commit.commitKind !== undefined && !force) {
        skipped++
        continue
      }

      const currentRateLimit = client.getRateLimit()
      if ((currentRateLimit.remaining ?? Infinity) < rateLimitFloor) {
        console.log(`rate limit below floor (${rateLimitFloor}), stopping early -- re-run to resume`)
        if (dirty) writeLedgerSafely(ledgerPath, commits)
        printSummary(processed, skipped, failed)
        return
      }

      try {
        const detail = await client.getCommit({ owner: config.githubOrg, repo: commit.repoName, ref: commit.sha })
        commit.additions = detail.stats?.additions ?? 0
        commit.deletions = detail.stats?.deletions ?? 0
        commit.changedFiles = detail.files?.length ?? 0
        const classification = classifyCommit({
          message: detail.commit.message?.split("\n")[0] ?? "",
          additions: commit.additions,
          deletions: commit.deletions,
          changedFiles: commit.changedFiles,
          filePaths: (detail.files ?? []).map((file) => ({ filename: file.filename, status: file.status })),
          parentCount: detail.parents?.length ?? 0,
        })
        commit.commitKind = classification.kind
        commit.parentCount = classification.parentCount
        commit.isConventionalMessage = classification.isConventionalMessage
        commit.messageLength = classification.messageLength
        commit.isVagueMessage = classification.isVagueMessage
        dirty = true
        processed++
      } catch (error) {
        failed++
        console.error(
          `failed to classify ${commit.repoName}:${commit.sha}: ${error instanceof Error ? error.message : error}`,
        )
      }

      if ((processed + failed) % progressInterval === 0) {
        const remaining = client.getRateLimit().remaining
        console.log(`${processed} classified, ${failed} failed so far -- rate limit remaining: ${remaining ?? "?"}`)
      }
    }

    if (dirty) writeLedgerSafely(ledgerPath, commits)
  }

  printSummary(processed, skipped, failed)
}

function printSummary(processed: number, skipped: number, failed: number) {
  console.log(`\ndone: ${processed} classified, ${skipped} already classified (skipped), ${failed} failed`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

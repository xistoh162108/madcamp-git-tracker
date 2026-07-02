import { runGithubSync } from "../src/sync/sync-runner"
import { loadConfig } from "../src/config/load-config"
import { resolveCurrentWeek } from "../src/config/schema"

const args = process.argv.slice(2)
const flags = new Set(args)
const weekArg = args.find((arg) => arg.startsWith("--week="))
const weekValue = weekArg?.split("=")[1]

// Default to whichever week is active right now, matching the admin UI's "현재 주차 동기화" behavior.
// `--week=all` opts into the library default of syncing every configured week's repos in one pass.
const week = weekValue === "all" ? undefined : weekValue ? Number(weekValue) : (resolveCurrentWeek(loadConfig()) ?? undefined)

if (!weekArg && week === undefined) {
  console.log("no camp week is active right now; skipping sync (pass --week=<n> or --week=all to override)")
  process.exit(0)
}

runGithubSync({ dryRun: flags.has("--dry-run"), week })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.ok ? 0 : 2)
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })

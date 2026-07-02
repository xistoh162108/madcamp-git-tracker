import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

const SyncStateSchema = z.object({
  repos: z.record(
    z.object({
      lastSyncedAt: z.string().optional(),
      lastSeenSha: z.string().optional(),
    }),
  ),
})

export type SyncState = z.infer<typeof SyncStateSchema>

export function readSyncState(statePath = path.join(process.cwd(), ".cache", "sync-state.json")): SyncState {
  try {
    return SyncStateSchema.parse(JSON.parse(fs.readFileSync(statePath, "utf8")))
  } catch {
    return { repos: {} }
  }
}

export function writeSyncState(state: SyncState, statePath = path.join(process.cwd(), ".cache", "sync-state.json")) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`)
}

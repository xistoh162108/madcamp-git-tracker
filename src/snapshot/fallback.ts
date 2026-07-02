import fs from "node:fs"

export function writeSnapshotSafely(pathname: string, json: unknown): void {
  const next = `${pathname}.next`
  fs.writeFileSync(next, `${JSON.stringify(json, null, 2)}\n`)
  fs.renameSync(next, pathname)
}

export function readSnapshotFallback<T>(pathname: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(pathname, "utf8")) as T
  } catch {
    return fallback
  }
}

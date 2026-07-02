import { NextResponse } from "next/server"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import latestSnapshot from "@/public/data/snapshots/latest.json"
import { loadConfig } from "@/src/config/load-config"
import { readSnapshotFallback } from "@/src/snapshot/fallback"

export async function GET(_request: Request, { params }: { params: Promise<{ week: string }> }) {
  const { week } = await params
  const weekNumber = Number(week)
  const config = loadConfig()
  const configuredWeek = config.weeks.find((item) => item.week === weekNumber && item.enabled)
  if (!Number.isInteger(weekNumber) || weekNumber <= 0 || !configuredWeek) {
    return NextResponse.json({ error: "unknown week" }, { status: 404 })
  }
  const latestCurrentWeek = Number((latestSnapshot as { currentWeek?: number | null }).currentWeek ?? 0)
  if (weekNumber > latestCurrentWeek && Date.now() < Date.parse(configuredWeek.startAt)) {
    return NextResponse.json({ error: "week has not started" }, { status: 404 })
  }

  const snapshotPath = path.join(process.cwd(), "public", "data", "snapshots", `${config.season}-w${weekNumber}.json`)
  if (!fs.existsSync(snapshotPath)) {
    return NextResponse.json({ error: "snapshot not found" }, { status: 404 })
  }
  const runtimeSnapshot = readSnapshotFallback(snapshotPath, latestSnapshot)
  const body = JSON.stringify(runtimeSnapshot)
  const etag = `"${crypto.createHash("sha256").update(body).digest("hex").slice(0, 16)}"`
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      ETag: etag,
      "Last-Modified": new Date(runtimeSnapshot.generatedAt).toUTCString(),
    },
  })
}

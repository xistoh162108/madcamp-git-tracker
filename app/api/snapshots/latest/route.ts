import { NextResponse } from "next/server"
import crypto from "node:crypto"
import path from "node:path"
import snapshot from "@/public/data/snapshots/latest.json"
import { readSnapshotFallback } from "@/src/snapshot/fallback"

export function GET() {
  const runtimeSnapshot = readSnapshotFallback(
    path.join(process.cwd(), "public", "data", "snapshots", "latest.json"),
    snapshot,
  )
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

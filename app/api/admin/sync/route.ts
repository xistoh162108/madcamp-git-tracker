import { NextRequest, NextResponse } from "next/server"
import { isAdminAuthorized } from "@/src/auth/admin"
import { runGithubSync } from "@/src/sync/sync-runner"

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean; week?: number }
  try {
    const result = await runGithubSync({ dryRun: Boolean(body.dryRun), week: body.week })
    return NextResponse.json(result, { status: result.ok ? 200 : 207, headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}

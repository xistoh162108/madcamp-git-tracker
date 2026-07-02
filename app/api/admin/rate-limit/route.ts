import { NextRequest, NextResponse } from "next/server"
import { isAdminAuthorized } from "@/src/auth/admin"
import { GitHubClient } from "@/src/github/client"

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const token = process.env.GITHUB_TOKEN
  if (!token) return NextResponse.json({ error: "GITHUB_TOKEN is not configured" }, { status: 503 })
  const rateLimit = await new GitHubClient({ token }).fetchRateLimit()
  return NextResponse.json(
    { ...rateLimit, resetAt: rateLimit.reset ? new Date(rateLimit.reset * 1000).toISOString() : null },
    { headers: { "Cache-Control": "no-store" } },
  )
}

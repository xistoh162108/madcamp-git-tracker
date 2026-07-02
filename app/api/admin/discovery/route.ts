import { NextRequest, NextResponse } from "next/server"
import { isAdminAuthorized } from "@/src/auth/admin"
import { loadConfig } from "@/src/config/load-config"
import { GitHubClient } from "@/src/github/client"
import { discoverTrackedRepos } from "@/src/github/discover-repos"

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const token = process.env.GITHUB_TOKEN
  if (!token) return NextResponse.json({ error: "GITHUB_TOKEN is not configured" }, { status: 503 })
  const config = loadConfig()
  const client = new GitHubClient({ token })
  const repos = await client.listOrgRepos(config.githubOrg)
  const discovery = discoverTrackedRepos(repos, config)
  return NextResponse.json(
    { ...discovery, rateLimit: client.getRateLimit() },
    { headers: { "Cache-Control": "no-store" } },
  )
}

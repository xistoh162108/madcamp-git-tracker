import type { GitHubRepoSummary } from "./discover-repos"

export interface GitHubRateLimit {
  limit?: number
  remaining?: number
  reset?: number
  used?: number
}

export interface GitHubCommitSummary {
  sha: string
  html_url?: string
  commit: {
    message?: string
    author?: {
      name?: string | null
      email?: string | null
      date?: string | null
    } | null
    committer?: {
      name?: string | null
      email?: string | null
      date?: string | null
    } | null
  }
  author?: {
    login?: string | null
  } | null
  committer?: {
    login?: string | null
  } | null
}

export interface GitHubBranchSummary {
  name: string
  commit?: {
    sha?: string
    url?: string
  }
  protected?: boolean
}

export interface PaginatedResult<T> {
  values: T[]
  pagesFetched: number
}

export class GitHubClient {
  private rateLimit: GitHubRateLimit = {}

  constructor(
    private readonly options: {
      token: string
      apiBaseUrl?: string
      userAgent?: string
    },
  ) {}

  getRateLimit(): GitHubRateLimit {
    return this.rateLimit
  }

  async listOrgRepos(org: string): Promise<GitHubRepoSummary[]> {
    return this.paginate<GitHubRepoSummary>(`/orgs/${encodeURIComponent(org)}/repos`, {
      type: "all",
      per_page: "100",
    })
  }

  async listCommits(params: {
    owner: string
    repo: string
    sha?: string
    since: string
    until: string
  }): Promise<GitHubCommitSummary[]> {
    return (await this.listCommitsWithMeta(params)).values
  }

  async listBranchesWithMeta(params: { owner: string; repo: string }): Promise<PaginatedResult<GitHubBranchSummary>> {
    return this.paginateWithMeta<GitHubBranchSummary>(
      `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/branches`,
      {
        per_page: "100",
      },
    )
  }

  async listCommitsWithMeta(params: {
    owner: string
    repo: string
    sha?: string
    since: string
    until: string
  }): Promise<PaginatedResult<GitHubCommitSummary>> {
    return this.paginateWithMeta<GitHubCommitSummary>(
      `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/commits`,
      {
        per_page: "100",
        sha: params.sha,
        since: params.since,
        until: params.until,
      },
    )
  }

  async fetchRateLimit(): Promise<GitHubRateLimit> {
    const json = (await this.request("/rate_limit")) as {
      resources?: { core?: { limit?: number; remaining?: number; reset?: number; used?: number } }
    }
    this.rateLimit = { ...this.rateLimit, ...json.resources?.core }
    return this.rateLimit
  }

  private async paginate<T>(pathname: string, query: Record<string, string | undefined>): Promise<T[]> {
    return (await this.paginateWithMeta<T>(pathname, query)).values
  }

  private async paginateWithMeta<T>(
    pathname: string,
    query: Record<string, string | undefined>,
  ): Promise<PaginatedResult<T>> {
    const values: T[] = []
    let pagesFetched = 0
    let page = 1
    for (;;) {
      const { json, nextPage } = await this.requestJson(pathname, { ...query, page: String(page) })
      const batch = json as T[]
      pagesFetched += 1
      values.push(...batch)
      if (nextPage === undefined) break
      page = nextPage
    }
    return { values, pagesFetched }
  }

  private async request(pathname: string, query: Record<string, string | undefined> = {}): Promise<unknown> {
    return (await this.requestJson(pathname, query)).json
  }

  private async requestJson(
    pathname: string,
    query: Record<string, string | undefined> = {},
  ): Promise<{ json: unknown; nextPage?: number }> {
    const url = new URL(pathname, this.options.apiBaseUrl ?? "https://api.github.com")
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value)
    }
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.options.token}`,
        "User-Agent": this.options.userAgent ?? "madcamp-github-activity-leaderboard",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    this.rateLimit = {
      limit: numberHeader(response, "x-ratelimit-limit") ?? this.rateLimit.limit,
      remaining: numberHeader(response, "x-ratelimit-remaining") ?? this.rateLimit.remaining,
      reset: numberHeader(response, "x-ratelimit-reset") ?? this.rateLimit.reset,
      used: numberHeader(response, "x-ratelimit-used") ?? this.rateLimit.used,
    }
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`GitHub API ${response.status} ${response.statusText}: ${body.slice(0, 300)}`)
    }
    return { json: await response.json(), nextPage: nextPageFromLink(response.headers.get("link")) }
  }
}

function numberHeader(response: Response, name: string): number | undefined {
  const value = response.headers.get(name)
  return value ? Number(value) : undefined
}

function nextPageFromLink(link: string | null): number | undefined {
  if (!link) return undefined
  for (const part of link.split(",")) {
    const [urlPart, relPart] = part.split(";").map((value) => value.trim())
    if (relPart !== 'rel="next"' || !urlPart?.startsWith("<") || !urlPart.endsWith(">")) continue
    const url = new URL(urlPart.slice(1, -1))
    const page = url.searchParams.get("page")
    return page ? Number(page) : undefined
  }
  return undefined
}

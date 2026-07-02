# Data and Sync Specification

## 1. Goals

- 관리자가 매주 팀 배정 CSV를 올리지 않아도 된다.
- GitHub Organization repository 목록에서 자동으로 추적 대상 repo를 찾는다.
- KST 기준 주차 구간으로 commit을 집계한다.
- frontend request마다 GitHub API를 호출하지 않는다.
- sync job에서만 GitHub API를 호출한다.
- rate limit, 실패, unknown user를 운영진에게 명확히 보여준다.

## 2. Inputs

### 2.1 Config

```json
{
  "season": "2026-summer",
  "displayName": "2026 여름학기",
  "timezone": "Asia/Seoul",
  "githubOrg": "madcamp-official",
  "repoNamePattern": "{season}-w{week}-c{class}-{teamNumber}",
  "classCount": 4,
  "weeks": [
    {
      "week": 1,
      "label": "1주차",
      "startAt": "2026-07-02T09:00:00+09:00",
      "endAt": "2026-07-09T08:59:59+09:00",
      "enabled": true
    }
  ]
}
```

### 2.2 Participants CSV

Minimum:

```csv
name,github_username,class
김가온,gaonkim,1
이하늘,haneullee,1
```

Recommended:

```csv
participant_id,name,github_username,email,class
p001,김가온,gaonkim,gaon@example.com,1
p002,이하늘,haneullee,haneul@example.com,1
```

### 2.3 GitHub auth

`.env.local` or CI secret:

```env
GITHUB_TOKEN=...
GITHUB_ORG=madcamp-official
ADMIN_TOKEN=...
```

## 3. Repository discovery

### 3.1 API

Use GitHub REST API to list organization repositories.

Pseudo:

```ts
const repos = await github.paginate(github.rest.repos.listForOrg, {
  org: config.githubOrg,
  per_page: 100,
  type: "all",
})
```

### 3.2 Parse

Regex for default pattern:

```regex
^(?<season>\d{4}-(?:summer|winter))-w(?<week>\d+)-c(?<class>\d+)-(?<teamNumber>\d{2})$
```

Validate:

- season matches config.season
- week exists in config.weeks
- class <= config.classCount
- teamNumber is two-digit

### 3.3 Output

```ts
interface DiscoveryResult {
  trackedRepos: TrackedRepo[]
  ignoredRepos: IgnoredRepo[]
  warnings: DiscoveryWarning[]
}
```

## 4. Week resolver

### 4.1 KST policy

- All week boundaries are configured as ISO datetime with `+09:00` offset.
- All commits are converted to UTC Date internally.
- Display is KST.
- Inclusive start, inclusive end or half-open interval must be chosen.

Recommended:

```txt
[startAt, endAt]
```

or more robust:

```txt
[startAt, nextWeek.startAt)
```

If explicit `endAt` is configured, use:

```txt
commitTime >= startAt && commitTime <= endAt
```

### 4.2 Boundary tests

- exactly startAt included
- one millisecond before startAt excluded
- exactly endAt included
- one millisecond after endAt excluded
- timezone conversion stable

## 5. Commit fetch

### 5.1 Default branch MVP

Fetch commits from repo default branch.

Parameters:

- since: week.startAt converted to ISO UTC
- until: week.endAt converted to ISO UTC
- per_page: 100

### 5.2 All branches optional

All branches mode:

1. list branches
2. fetch commits by branch sha
3. dedupe by SHA

Potential issue:

- rebase / force push can move commits
- duplicate commits across branches
- more API calls

Default to default branch for MVP. Add all-branch mode as config option later.

## 6. Deduplication

Deduplicate by:

```txt
repoName + commitSha
```

Never count same commit SHA twice in same repo.

## 7. Commit author mapping

Priority:

1. `commit.author.login` from GitHub API
2. compare login with participant.githubUsername case-insensitively
3. optional aliases
4. unknown user

Unknown user record:

```ts
interface UnknownUser {
  repoName: string
  sha: string
  authorLogin?: string
  authorName?: string
  committedAt: string
  reason: "not_in_participants_csv" | "missing_author" | "bot" | "external"
}
```

Bot accounts:

- exclude known bots by default
- show in admin

Examples:

```txt
dependabot[bot]
github-actions[bot]
vercel[bot]
```

## 8. Aggregation

### 8.1 Personal stats

Group by participantId:

- commits
- activeDays
- repos
- classes involved
- teams involved
- lastActivityAt
- dailyCounts

### 8.2 Team stats

Group by repoName:

- week
- class
- teamNumber
- totalCommits
- activeParticipants
- averagePerPerson
- activeDays
- lastActivityAt

### 8.3 Class stats

Group by class:

- totalCommits
- participantCount
- activeParticipantCount
- activeRepos
- averagePerPerson
- averagePerActivePerson
- lastActivityAt

Default ranking metric:

```txt
averagePerPerson = totalCommits / participantCount
```

If participant class is not fixed or unknown, participantCount can be estimated from discovered active participants or admin-provided class count. Prefer admin participant CSV class when available.

## 9. Today / recent 24h highlights

Do not make daily ranking a main tab.

Generate sidebar highlight:

- todayCommitCount
- mostActiveTeamLast24h
- fastestRisingParticipant
- newCommitsSinceLastSync

Window:

```txt
now - dailyWindowHours to now
```

Timezone: display KST.

## 10. Snapshot output

### 10.1 Public snapshot

```txt
public/data/snapshots/latest.json
```

Do not include:

- GitHub token
- emails
- raw private commit messages
- admin-only unknown user details if sensitive

### 10.2 Admin snapshot

```txt
.data/admin/latest-admin.json
```

Protected by server-only route or local file.

May include:

- unknown users
- failed repos
- rate limit
- raw sync logs

## 11. Cache strategy

### 11.1 Static snapshot

- `latest.json` served as static asset
- frontend fetches with controlled cache
- show generatedAt

### 11.2 Next.js route cache

For `/api/snapshots/latest`:

```ts
headers: {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
}
```

Admin endpoints:

```txt
Cache-Control: no-store
```

### 11.3 GitHub API cache

- Do not poll on user request
- Store sync-state
- Use conditional request headers if implemented
- Use rate limit status
- Avoid excessive all-branch fetching

## 12. Error handling

### 12.1 Sync failure

- Do not delete previous snapshot
- Mark current sync as failed
- Keep UI available with stale data

UI message:

```txt
GitHub 데이터를 새로 불러오지 못했습니다. 마지막 동기화 데이터를 기준으로 표시합니다.
```

### 12.2 Partial failure

- Some repos failed
- Continue other repos
- Admin panel shows failed list
- Public UI can show warning if severe

### 12.3 Rate limit

- Stop sync gracefully
- Save partial progress if safe
- Show next reset time

## 13. Commands

```bash
pnpm sync:github
pnpm sync:github --dry-run
pnpm sync:github --week 2
pnpm validate:config
pnpm validate:participants ./data/participants.csv
pnpm discover:repos
```

## 14. GitHub Actions schedule

Example:

```yaml
name: Sync GitHub Activity

on:
  workflow_dispatch:
  schedule:
    - cron: "0 * * * *"

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm sync:github
        env:
          GITHUB_TOKEN: ${{ secrets.MADCAMP_GITHUB_TOKEN }}
      - run: pnpm test
      - name: Commit snapshot
        run: |
          git config user.name "madcamp-bot"
          git config user.email "madcamp-bot@example.com"
          git add public/data/snapshots .cache/sync-state.json
          git commit -m "chore: update leaderboard snapshot" || echo "No changes"
          git push
```

Note: scheduled workflow behavior and frequency depend on GitHub Actions schedule support and limits.

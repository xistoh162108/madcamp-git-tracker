# Software Design Document — MadCamp GitHub Activity Leaderboard

## 1. 개요

### 1.1 제품명

- 한국어: 몰입 랭킹
- 영어/내부명: MadCamp GitHub Activity Leaderboard

### 1.2 목적

몰입캠프 기간 동안 주차별로 생성되는 GitHub repository 활동을 수집해 참가자, 팀, 분반 단위의 활동 흐름을 보여주는 dashboard를 만든다.

핵심 목적은 “누가 더 잘했는지 평가”가 아니라 다음이다.

- 참가자가 캠프의 개발 흐름을 재미있게 볼 수 있음
- 운영진이 repo 활동과 동기화 상태를 빠르게 파악할 수 있음
- 팀/분반별 GitHub 사용을 자연스럽게 장려함
- 주차별 산출물 repository가 잘 사용되고 있는지 확인함

### 1.3 핵심 원칙

1. 관리자 설정이 쉬워야 한다.
2. 매주 팀 배정 CSV를 요구하지 않는다.
3. GitHub Organization repository 목록과 naming rule로 추적 대상을 자동 발견한다.
4. 최대한 서버리스 또는 가벼운 구조로 운영한다.
5. Supabase는 쓰지 않는다.
6. DB가 필요하면 Docker PostgreSQL을 사용한다.
7. UI는 실제 제품처럼 보여야 하며, AI-generated dashboard 느낌을 제거한다.
8. 애니메이션은 충분히 사용하되, cheap neon이 아니라 고품질 micro-interaction으로 구현한다.
9. lint/typecheck/test/build는 반드시 통과한다.

## 2. 사용자와 역할

### 2.1 참가자

- 개인/팀/분반 랭킹 확인
- 현재 주차와 전체 기간 활동 확인
- 최근 활동 feed 확인
- 자신의 GitHub 활동, 팀 repo, heatmap 확인
- 랭킹은 참고용임을 이해함

### 2.2 운영진/관리자

- GitHub token/API 정보 설정
- 캠프 주차/분반 설정
- 참가자 CSV 업로드/검증
- repo discovery 결과 확인
- sync 수동 실행
- sync 실패/누락/unknown user 확인
- API rate limit 확인
- 공개 옵션 관리

## 3. 관리자 입력 요구사항

관리자는 다음만 제공한다.

### 3.1 GitHub 설정

- `githubOrg`: 예: `madcamp-official`
- 인증 방식:
  - MVP: GitHub fine-grained PAT 또는 classic PAT
  - 추후: GitHub App
- 권장 scope:
  - public repo만 추적하면 public read 권한
  - private repo 포함이면 repo read 권한
  - team membership을 읽고 싶으면 read:org 권한 필요

GitHub REST API는 인증된 요청이 비인증 요청보다 높은 rate limit을 제공한다. GitHub 공식 문서도 REST API 인증과 rate limit을 별도로 안내한다. [GitHub REST authentication](https://docs.github.com/rest/authentication/authenticating-to-the-rest-api), [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2026-03-10)

### 3.2 캠프 설정

- `season`: `2026-summer`
- `displayName`: `2026 여름학기`
- `timezone`: `Asia/Seoul`
- `classCount`: 예: 4
- `weekCount`: 예: 4
- 주차별 `startAt`, `endAt`
- repo naming pattern

### 3.3 참가자 CSV

MVP 기본 CSV:

```csv
name,github_username,class
김가온,gaonkim,1
이하늘,haneullee,1
박서연,seoyeonpark,2
```

권장 CSV:

```csv
participant_id,name,github_username,email,class
p001,김가온,gaonkim,gaon@example.com,1
p002,이하늘,haneullee,haneul@example.com,1
```

- `github_username`은 필수다.
- `name`은 필수다.
- `participant_id`가 없으면 service가 stable slug를 생성하되, CSV 변경 시 같은 사람 매칭이 흔들릴 수 있음을 경고한다.
- `class`는 고정 분반이 있다면 사용한다. 없으면 commit repo의 class 값을 기준으로 현재 활동 분반을 계산한다.

## 4. 자동 discovery 정책

### 4.1 Repository discovery

서비스는 GitHub Organization의 repository 목록을 조회한다.

GitHub REST API는 repository commit list endpoint를 제공하고, commits endpoint는 기간 필터와 branch/sha 등을 활용해 repository commit을 조회하는 데 사용된다. [GitHub commits API](https://docs.github.com/rest/commits/commits)

repository name이 다음 pattern과 일치하면 추적 대상이다.

```txt
{season}-w{week}-c{class}-{teamNumber}
```

예:

```txt
2026-summer-w2-c3-07
```

파싱 결과:

```json
{
  "season": "2026-summer",
  "week": 2,
  "class": 3,
  "teamNumber": "07"
}
```

### 4.2 현재 주차 계산

- 모든 주차 시간은 `Asia/Seoul` 기준이다.
- 내부 저장은 UTC timestamp를 권장하되, 구간 계산은 KST 설정에 따른다.
- 현재 시간이 어떤 week의 `[startAt, endAt]`에 포함되면 currentWeek로 표시한다.
- 관리자 설정의 `currentWeekOverride`가 있으면 우선한다.

### 4.3 추적 대상 repo 계산

- 현재 주차 화면: `season == config.season && week == currentWeek`
- 전체 기간 화면: `season == config.season && week in enabledWeeks`
- 특정 주차 화면: `season == config.season && week == selectedWeek`

### 4.4 팀 구성 계산

관리자가 주차별 팀 배정 CSV를 제공하지 않는 것을 목표로 한다.

팀원 목록 산출 우선순위:

1. GitHub Team naming convention이 존재하고 read:org 권한이 있으면 team membership 사용
   - team slug: `{repoName}-team`
2. repository collaborators/contributors가 접근 가능하면 해당 목록 사용
3. commit author 중 participant CSV와 매핑된 사람을 팀원으로 추정
4. 그래도 알 수 없는 사람은 `unmapped` 또는 `external`로 표시

MVP에서는 3번 방식만으로도 동작해야 한다. 즉, commit이 없는 팀원은 팀원 목록에 보이지 않을 수 있다. UI에는 이를 “GitHub 활동 기준으로 추정된 팀원”이라고 운영진 화면에서 안내한다.

## 5. 랭킹 정책

### 5.1 메인 지표

공개 리더보드의 기본 지표는 commit count다.

단, commit count는 기여도 평가가 아니라 activity reference로 표현한다.

필수 문구:

> 커밋 수는 GitHub 활동량을 보여주는 참고 지표입니다. 작은 커밋, 문서 정리, 기획, 디자인, 디버깅도 모두 중요한 기여입니다.

### 5.2 Line count 정책

line count는 공개 메인 랭킹 지표로 쓰지 않는다.

이유:

- 자동 생성 파일, lock file, build output 때문에 왜곡됨
- 많은 line 추가가 반드시 좋은 기여는 아님
- line 삭제가 좋은 refactoring일 수 있음

운영진 상세 화면에서는 다음과 같이 보조 지표로만 표시한다.

- changed lines added
- changed lines deleted
- excluded generated files count

제외 패턴:

```txt
node_modules/**
dist/**
build/**
out/**
.next/**
*.min.js
*.map
package-lock.json
pnpm-lock.yaml
yarn.lock
*.generated.*
Library/**
Binaries/**
Intermediate/**
Saved/**
```

### 5.3 개인 랭킹

- 주차별 개인 commit 수
- 전체 기간 개인 commit 수
- 보조: 활동일 수, 최근 활동, 순위 변화

### 5.4 팀 랭킹

- 기본: 팀 총 commit 수
- 보조: 인당 평균 commit 수, 활동일 수, 최근 활동

### 5.5 분반 랭킹

분반별 인원 수가 다를 수 있으므로 기본 정렬은 인당 평균이다.

- 기본: 인당 평균 commit 수
- 토글: 총합 commit 수

필수 문구:

> 분반 랭킹은 인원 차이를 보정하기 위해 기본적으로 인당 평균 기준으로 표시됩니다.

### 5.6 일간 랭킹

일간 랭킹은 메인 탭으로 만들지 않는다.

대신 다음 보조 위젯으로 제공한다.

- 오늘의 활동
- 최근 24시간 하이라이트
- 오늘 가장 활발한 팀
- 최근 24시간 상승 팀
- 마지막 동기화 이후 새 커밋 수

관리자 설정:

```json
{
  "showDailyHighlights": true,
  "dailyWindowHours": 24
}
```

## 6. 아키텍처

### 6.1 권장 MVP: Static Snapshot Mode

```txt
GitHub Actions / local sync CLI
        ↓
GitHub REST API
        ↓
Aggregation engine
        ↓
public/data/snapshots/*.json
        ↓
Next.js static/edge frontend
```

장점:

- DB 없음
- 배포가 가벼움
- 서버리스 친화적
- frontend에서 GitHub token 노출 없음
- GitHub API 호출이 사용자 요청마다 발생하지 않음

단점:

- 매우 세밀한 incremental query나 long-term raw commit 저장은 제한적
- snapshot 관리 필요

### 6.2 확장 모드: PostgreSQL Docker Mode

```txt
Next.js app / sync worker
        ↓
GitHub REST API
        ↓
PostgreSQL Docker
        ↓
Next.js dashboard
```

Docker Compose:

- `app`
- `postgres`
- optional: `worker`

DB 사용 시에도 frontend 요청 path에서 GitHub API를 직접 호출하지 않는다.

Next.js는 Docker standalone output으로 컨테이너화할 수 있다. Next.js 공식 deploy 문서도 standalone output을 사용해 최소 runtime 파일을 포함한 production-ready Docker image를 만들 수 있음을 안내한다. [Next.js deploying docs](https://nextjs.org/docs/app/getting-started/deploying)

## 7. 데이터 모델

### 7.1 Config schema

```ts
export const AppConfigSchema = z.object({
  season: z.string(),
  displayName: z.string(),
  timezone: z.literal("Asia/Seoul").default("Asia/Seoul"),
  githubOrg: z.string(),
  repoNamePattern: z.string().default("{season}-w{week}-c{class}-{teamNumber}"),
  classCount: z.number().int().positive(),
  weeks: z.array(z.object({
    week: z.number().int().positive(),
    label: z.string(),
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    enabled: z.boolean().default(true),
  })),
  ranking: z.object({
    defaultClassMetric: z.enum(["averagePerPerson", "total"]).default("averagePerPerson"),
    showDailyHighlights: z.boolean().default(true),
    dailyWindowHours: z.number().int().positive().default(24),
    showBadges: z.boolean().default(true),
  })
})
```

### 7.2 Participant

```ts
interface Participant {
  participantId: string
  name: string
  githubUsername: string
  email?: string
  class?: number
  aliases?: string[]
}
```

### 7.3 Repository metadata

```ts
interface TrackedRepo {
  id: number
  name: string
  url: string
  season: string
  week: number
  class: number
  teamNumber: string
  private: boolean
  defaultBranch: string
  lastPushedAt?: string
}
```

### 7.4 Commit record

```ts
interface CommitRecord {
  sha: string
  repoName: string
  week: number
  class: number
  teamNumber: string
  authorGithubUsername?: string
  authorName?: string
  authorEmailHash?: string
  participantId?: string
  committedAt: string
  committedAtKst: string
  messageSummary?: string
  additions?: number
  deletions?: number
}
```

### 7.5 Aggregated snapshot

```ts
interface LeaderboardSnapshot {
  generatedAt: string
  generatedAtKst: string
  season: string
  currentWeek: number | null
  sync: SyncSummary
  summary: SummaryMetrics
  weeks: WeekSummary[]
  rankings: {
    personal: RankingSet
    teams: RankingSet
    classes: RankingSet
  }
  heatmaps: HeatmapData
  activityFeed: ActivityFeedItem[]
  unknownUsers: UnknownUser[]
}
```

## 8. GitHub sync 상세

### 8.1 인증

- token은 `.env.local` 또는 CI secret에만 둔다.
- client bundle에 절대 포함하지 않는다.
- 관리자 UI에서 입력받는 경우 서버에만 저장한다.

### 8.2 Rate limit

- `/rate_limit` endpoint 또는 response headers를 저장한다.
- sync status panel에 표시한다.
- rate limit이 부족하면 다음 sync에서 이어서 처리한다.

GitHub는 rate limit status endpoint를 제공한다. [GitHub rate limit endpoint](https://docs.github.com/rest/rate-limit/rate-limit)

### 8.3 Incremental sync

- repo별 `lastSyncedAt` 또는 `lastSeenSha` 저장
- snapshot mode에서는 `.cache/sync-state.json` 사용 가능
- PostgreSQL mode에서는 `sync_state` table 사용
- `since`, `until`을 사용해 주차 구간별 commit fetch
- SHA 기준 deduplication 필수

### 8.4 Branch 정책

MVP:

- default branch commits를 기본 수집한다.

확장:

- 모든 branch를 수집하고 SHA dedupe한다.
- 단, force push/rebase 대응 복잡도가 올라가므로 관리자 설정으로 선택 가능하게 한다.

### 8.5 Commit author mapping

매핑 우선순위:

1. GitHub API commit `author.login`
2. commit email/name을 participant alias와 매칭
3. unknown user로 기록

unknown user는 운영진 화면에 표시한다.

## 9. UI/UX 상세

### 9.1 전체 레이아웃

Desktop:

```txt
TopNav
WeekSelector + SyncStatus
MetricCards
MainGrid:
  Left: LeaderboardTable + CompactTopThree
  Right: ActivityFeed + AdminSyncMini
Bottom:
  ContributionHeatmap
  TrendChart
```

Mobile:

```txt
TopNav
WeekSelector
MetricCards 2 columns
CompactTopThree
Leaderboard card list
ActivityFeed
Heatmap horizontal scroll
```

### 9.2 디자인 방향

절대 과한 cyber/neon dashboard를 만들지 않는다.

목표:

- Duolingo dark leaderboard처럼 경쾌함
- GitHub contribution graph처럼 개발자 활동 명확성
- Linear/Vercel처럼 제품형 신뢰감
- Grafana/Datadog처럼 운영 dashboard 명확성

### 9.3 Design tokens

```txt
Background: #050816
Surface: #0B1020
Surface elevated: #111827
Border: rgba(255,255,255,0.08)
Primary: #22D3EE
Secondary: #8B5CF6
Success: #84CC16
Warning/Gold: #FACC15
Danger: muted red
Text primary: #F8FAFC
Text secondary: #94A3B8
Card radius: 16px
Button radius: 10px
Glow: 기본 금지, Top 1 medal에만 약하게 허용
```

### 9.4 Animation

필수:

- Framer Motion 또는 CSS transition 사용 가능
- prefers-reduced-motion 대응
- row enter stagger
- count-up
- rank movement highlight
- heatmap hover tooltip
- activity feed slide-in
- sync pulse

과한 particle, neon pulse, spinning 3D 효과 금지.

## 10. Admin UI

### 10.1 설정 화면

- GitHub org/token status
- season config
- week schedule editor
- class count editor
- participant CSV upload/validation
- repo discovery preview
- ranking visibility toggles
- daily highlights toggle
- sync interval 설정

### 10.2 Sync screen

- last sync time
- next sync time
- status
- rate limit
- repos scanned
- commits processed
- failed repos
- unknown users
- logs
- manual sync button

## 11. API endpoints

MVP snapshot mode에서는 API endpoint가 최소화된다.

가능한 endpoints:

```txt
GET /api/health
GET /api/config/public
GET /api/snapshots/latest
POST /api/admin/sync
POST /api/admin/upload-participants
GET /api/admin/discovery
GET /api/admin/rate-limit
```

Admin endpoint는 인증이 필요하다. MVP에서는 `ADMIN_TOKEN` header 기반으로 단순 구현 가능하다.

## 12. 보안

- GitHub token은 서버/CI secret에만 존재
- participant CSV는 private storage 또는 server-side data로 관리
- public snapshot에는 필요한 공개 정보만 포함
- email은 public snapshot에서 제외하거나 hash 처리
- admin endpoint는 token auth 적용
- rate limit abuse 방지
- CSV upload size limit
- zod validation 필수
- HTML injection 방지를 위해 commit message를 raw render하지 않음

OWASP ZAP baseline scan은 Docker image 기반으로 passive scan 중심의 baseline을 실행할 수 있다. [ZAP Baseline Scan](https://www.zaproxy.org/docs/docker/baseline-scan/)

## 13. 테스트/품질

자세한 내용은 `05_TESTING_QUALITY_SECURITY.md`를 따른다.

필수:

- lint 0 errors
- typecheck 0 errors
- unit tests pass
- property fuzz tests pass
- e2e tests pass
- build pass
- Docker build pass

## 14. 배포

### 14.1 Serverless/static

- GitHub Actions cron으로 snapshot 생성
- Vercel/Cloudflare Pages로 frontend 배포 가능

GitHub Actions는 schedule event로 workflow를 특정 시간에 실행할 수 있다. [GitHub Actions scheduled workflows](https://docs.github.com/actions/using-workflows/events-that-trigger-workflows)

### 14.2 Docker local/self-host

- `docker compose up -d --build`
- PostgreSQL 사용 시 compose profile 제공
- Next.js standalone output 사용 권장

### 14.3 Tailscale preview

최종 단계에서 Tailscale 내부망으로 UI 접근 가능하게 설정한다. 자세한 내용은 `06_TAILSCALE_PREVIEW.md`.

## 15. 완료 조건

- 관리자 입력 최소 요구사항 충족
- repo 자동 discovery 작동
- KST 주차 계산 정확
- 참가자 CSV 매핑 작동
- 개인/팀/분반 랭킹 작동
- heatmap/trend/activity feed 작동
- admin sync/status 작동
- UI가 기존 AI dashboard 느낌에서 벗어남
- 애니메이션 구현
- lint/typecheck/test/build 통과
- Docker/Tailscale preview 가능

# Implementation Plan

## Phase 0 — Repository inspection

### Goal

현재 코드베이스와 디자인 ZIP을 정확히 파악한다.

### Tasks

1. 현재 위치 확인

```bash
pwd
find . -maxdepth 3 -type f | sed 's#^./##' | sort | head -200
```

2. package manager 확인

```bash
ls package.json pnpm-lock.yaml yarn.lock package-lock.json 2>/dev/null
```

3. 디자인 ZIP 존재 확인

```bash
ls -lh /home/xistoh162108/Documents/projects/26_03_madcamp-service/git-tracker/*.zip
```

4. 디자인 ZIP 압축 해제

```bash
mkdir -p .design-input/v0 .design-input/figma
unzip -o /home/xistoh162108/Documents/projects/26_03_madcamp-service/git-tracker/madcamp-leaderboard-design.zip -d .design-input/v0
unzip -o "/home/xistoh162108/Documents/projects/26_03_madcamp-service/git-tracker/Proceed with design.zip" -d .design-input/figma
```

5. 두 디자인의 공통 구조와 문제점 정리

- 공통 컴포넌트
- 색상
- layout
- AI-generated 느낌이 나는 부분
- 재사용할 수 있는 부분
- 제거할 부분

### Done criteria

- 현재 stack 파악
- 디자인 zip 내용 파악
- 리디자인 방향 메모 작성

---

## Phase 1 — Project baseline

### Goal

Next.js + TypeScript + Tailwind + shadcn/ui 기반을 정리한다.

### Tasks

1. TypeScript strict 모드 확인
2. ESLint/Prettier 설정 확인 또는 추가
3. Tailwind 설정 확인
4. shadcn/ui 설정 확인
5. lucide-react, Recharts, zod, date library, test libraries 확인/설치

권장 dependencies:

```bash
pnpm add zod lucide-react recharts date-fns clsx tailwind-merge class-variance-authority
pnpm add -D vitest @testing-library/react @testing-library/jest-dom playwright fast-check eslint prettier
```

기존 package manager가 pnpm이 아니면 프로젝트에 맞춘다.

### Done criteria

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

이 명령이 존재하지 않으면 scripts를 추가한다.

---

## Phase 2 — Config system

### Goal

관리자가 주차/분반/season/GitHub org를 쉽게 설정할 수 있게 한다.

### Files

```txt
src/config/schema.ts
src/config/load-config.ts
config/madcamp.config.json
```

### Example config

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
    },
    {
      "week": 2,
      "label": "2주차",
      "startAt": "2026-07-09T09:00:00+09:00",
      "endAt": "2026-07-16T08:59:59+09:00",
      "enabled": true
    }
  ],
  "ranking": {
    "defaultClassMetric": "averagePerPerson",
    "showDailyHighlights": true,
    "dailyWindowHours": 24,
    "showBadges": true
  }
}
```

### Tests

- missing required fields
- invalid timezone
- overlapping week periods
- endAt before startAt
- duplicate week numbers

---

## Phase 3 — Participant CSV parser

### Goal

참가자 이름-GitHub 계정 CSV를 robust하게 처리한다.

### Files

```txt
src/participants/parse-participants.ts
src/participants/participant-schema.ts
src/participants/participants.sample.csv
```

### Requirements

- UTF-8 CSV 지원
- BOM 제거
- header validation
- duplicate github username 검출
- empty username 검출
- GitHub username 형식 검증
- optional aliases 지원
- unknown columns는 warning

### Tests

- valid CSV
- duplicate usernames
- missing columns
- Korean names
- BOM included CSV
- malformed rows
- fuzzing with fast-check

---

## Phase 4 — Repository name parser and discovery

### Goal

GitHub org에서 repo 목록을 가져오고 naming pattern으로 추적 repo를 찾는다.

### Files

```txt
src/github/client.ts
src/github/discover-repos.ts
src/github/repo-name-parser.ts
```

### Parser behavior

Input:

```txt
2026-summer-w2-c3-07
```

Output:

```json
{
  "season": "2026-summer",
  "week": 2,
  "class": 3,
  "teamNumber": "07"
}
```

### Requirements

- non-matching repo ignored
- disabled week ignored
- class > classCount warning
- malformed team number warning
- private/public repo both supported if token can access

### Tests

- parser unit tests
- parser property fuzzing
- discovery with mocked GitHub API

---

## Phase 5 — GitHub sync engine

### Goal

GitHub API에서 commit을 가져오고 참가자와 매핑한다.

### Files

```txt
src/sync/sync-runner.ts
src/sync/fetch-commits.ts
src/sync/map-commit-author.ts
src/sync/sync-state.ts
```

### Requirements

- token은 server-only
- rate limit header 저장
- failed repo 기록
- commit SHA dedupe
- since/until으로 주차 구간별 조회
- default branch MVP
- all branches optional later
- unknown author 기록
- snapshot fallback

### CLI

```bash
pnpm sync:github
pnpm sync:github --week 2
pnpm sync:github --dry-run
```

### Done criteria

- mocked API test pass
- real token이 있으면 dry-run 가능
- snapshot JSON 생성

---

## Phase 6 — Aggregation engine

### Goal

raw commit에서 personal/team/class ranking과 heatmap 데이터를 만든다.

### Files

```txt
src/aggregation/aggregate.ts
src/aggregation/rankings.ts
src/aggregation/heatmap.ts
src/aggregation/activity-feed.ts
```

### Invariants

- total personal commits sum == mapped commits total
- team commits sum == repo commits total
- class total == sum of class repos
- class average == class total / participant count or active participant count based on config
- duplicate SHA counted once per repo
- unknown users excluded from personal ranking but shown in admin

### Tests

- fixture-based unit tests
- property-based tests with fast-check
- date boundary tests

---

## Phase 7 — Snapshot storage

### Goal

DB 없이도 frontend가 읽을 수 있는 snapshot을 생성한다.

### Files

```txt
public/data/snapshots/latest.json
public/data/snapshots/2026-summer-w1.json
public/data/snapshots/2026-summer-w2.json
.cache/sync-state.json
```

### Requirements

- latest snapshot 항상 존재
- sync 실패 시 이전 snapshot 유지
- generatedAt 포함
- public snapshot에서 secret/email 제거
- unknown users는 admin snapshot에만 포함 가능

---

## Phase 8 — UI redesign

### Goal

기존 v0/Figma 디자인의 싼티를 제거하고 실제 제품형 leaderboard를 만든다.

### Component files

```txt
src/components/app-shell.tsx
src/components/top-nav.tsx
src/components/week-selector.tsx
src/components/sync-status-badge.tsx
src/components/metric-card.tsx
src/components/leaderboard-table.tsx
src/components/leaderboard-row.tsx
src/components/compact-top-three.tsx
src/components/activity-feed.tsx
src/components/contribution-heatmap.tsx
src/components/trend-chart.tsx
src/components/admin-sync-panel.tsx
```

### Requirements

- Korean UI
- desktop/mobile responsive
- shadcn/ui components only
- Recharts for charts
- lucide-react icons only
- animation with reduced motion support
- no large hero
- main leaderboard visible above fold
- compact top 3 only
- activity feed and sync status clear

---

## Phase 9 — Admin UI

### Goal

관리자가 설정/검증/동기화 상태를 쉽게 다룬다.

### Pages

```txt
/admin
/admin/settings
/admin/sync
```

### Requirements

- simple token/env status display, never expose full token
- config editor or config viewer
- week schedule editor
- participant CSV upload/validate
- repo discovery preview
- manual sync button
- sync logs
- rate limit status
- failed repo list

MVP에서 설정 저장이 복잡하면 config file 기반 read-only admin view로 시작하고, CSV upload는 local file ingestion script로 시작해도 된다.

---

## Phase 10 — Testing, fuzzing, security

자세한 내용은 `05_TESTING_QUALITY_SECURITY.md`.

Minimum commands:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:fuzz
pnpm test:e2e
pnpm build
pnpm audit
```

Optional:

```bash
schemathesis run http://localhost:3000/openapi.json
zap-baseline.py -t http://localhost:3000
```

---

## Phase 11 — Docker and Tailscale preview

### Goal

완성 후 내부망에서 사용자가 UI를 확인할 수 있게 한다.

### Tasks

1. Dockerfile 작성
2. docker-compose.yml 작성
3. optional PostgreSQL profile 작성
4. Next.js production start 확인
5. Tailscale IP 확인
6. README에 preview 방법 작성

자세한 내용은 `06_TAILSCALE_PREVIEW.md`.

---

## Final checklist

- [ ] 두 디자인 ZIP 확인 완료
- [ ] 기존 디자인의 싼티 제거
- [ ] 관리자 최소 입력 조건 충족
- [ ] GitHub repo 자동 discovery
- [ ] KST 주차 계산 정확
- [ ] commit sync 작동
- [ ] 개인/팀/분반 랭킹 작동
- [ ] 오늘의 활동 위젯 작동
- [ ] heatmap 작동
- [ ] admin sync 상태 작동
- [ ] animations 구현
- [ ] mobile responsive
- [ ] lint pass
- [ ] typecheck pass
- [ ] unit pass
- [ ] fuzz pass
- [ ] e2e pass
- [ ] build pass
- [ ] Docker pass
- [ ] Tailscale preview ready

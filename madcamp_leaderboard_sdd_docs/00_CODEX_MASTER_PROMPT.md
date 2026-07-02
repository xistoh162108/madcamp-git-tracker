# Codex Master Prompt — MadCamp GitHub Activity Leaderboard

너는 이 repository의 수석 풀스택 엔지니어이자 프로덕트 디자이너다. 지금부터 `MadCamp GitHub Activity Leaderboard`를 완성해야 한다.

이 문서 묶음의 모든 요구사항을 읽고, repository 상태를 점검한 뒤, 실제로 작동하는 제품으로 구현하라. 코드 작성 전 반드시 현재 폴더 구조, package manager, framework, 기존 디자인 ZIP 파일을 확인하라.

## 0. 현재 사용자가 제공한 디자인 ZIP

사용자 로컬 환경에는 다음 두 ZIP이 있다.

```txt
/home/xistoh162108/Documents/projects/26_03_madcamp-service/git-tracker/madcamp-leaderboard-design.zip
/home/xistoh162108/Documents/projects/26_03_madcamp-service/git-tracker/Proceed with design.zip
```

- `madcamp-leaderboard-design.zip`: v0 / Vercel이 디자인한 버전
- `Proceed with design.zip`: Figma Make가 디자인한 버전

반드시 먼저 두 ZIP을 확인하고 압축을 풀어라. 단, 기존 디자인을 그대로 복사하지 마라. 두 디자인이 서로 비슷하지만 현재 사용자는 “AI가 디자인한 싼티 나는 사이트”처럼 느껴진다고 했다. 따라서 두 ZIP의 좋은 구조만 가져오고, 전체 미감은 다시 고쳐야 한다.

디자인 최종 방향은 다음이다.

- Duolingo dark leaderboard처럼 생동감 있는 리더보드
- GitHub contribution graph처럼 개발자 활동이 명확히 보이는 UI
- Linear/Vercel처럼 차분하고 신뢰감 있는 제품형 dashboard
- Grafana/Datadog처럼 운영 정보가 정확한 monitoring dashboard
- shadcn/ui 기반의 일관된 컴포넌트 시스템
- 절대 AI-generated cyber dashboard, 코인 대시보드, NFT 게임, 해커톤 홍보 페이지처럼 보이면 안 됨

## 1. 제품 목표

MadCamp 참가자들의 GitHub repository 활동을 기반으로 다음을 제공하는 웹서비스를 만든다.

- 현재 주차 개인 랭킹
- 현재 주차 팀 랭킹
- 현재 주차 분반 랭킹
- 전체 기간 개인 랭킹
- 전체 기간 팀 랭킹
- 전체 기간 분반 랭킹
- 오늘의 활동 / 최근 24시간 하이라이트
- GitHub activity heatmap
- 최근 활동 feed
- 관리자 설정 및 동기화 상태 화면

이 서비스는 평가/감시 도구가 아니다. 캠프 분위기를 게임처럼 재미있게 만들고, 개발 흐름을 한눈에 보여주는 참고용 activity dashboard다.

반드시 다음 문구를 UI에 포함하라.

> 커밋 수는 GitHub 활동량을 보여주는 참고 지표입니다. 작은 커밋, 문서 정리, 기획, 디자인, 디버깅도 모두 중요한 기여입니다.

분반 랭킹에는 다음 문구를 포함하라.

> 분반 랭킹은 인원 차이를 보정하기 위해 기본적으로 인당 평균 기준으로 표시됩니다.

시간 기준 안내도 포함하라.

> 모든 랭킹은 KST 기준 주차 설정에 따라 집계됩니다.

## 2. 관리자 입력은 최소여야 한다

관리자가 직접 제공하는 것은 다음뿐이다.

1. GitHub Organization 접근 정보
   - organization name
   - GitHub token 또는 GitHub App 설정
2. 캠프 설정
   - season id
   - 표시 이름
   - 캠프 기간
   - 주차 개수
   - 주차별 KST 시작/종료 일시
   - 분반 개수
3. 참가자 CSV
   - 참가자 이름
   - GitHub username
   - 선택 정보: 분반, 이메일, participant_id

관리자는 매주 팀 배정 CSV를 올리지 않는 것을 기본 목표로 한다.

서비스는 다음을 자동으로 처리해야 한다.

- GitHub Organization repository 목록 조회
- naming pattern을 바탕으로 season/week/class/teamNumber 파싱
- 현재 주차가 무엇인지 KST 기준으로 계산
- 현재 주차에 추적해야 할 repository 자동 선택
- repo별 commit 수집
- commit author를 GitHub username 및 참가자 CSV와 매핑
- 팀/분반/개인 랭킹 계산
- 전체 기간 누적 랭킹 계산
- 동기화 상태, API rate limit, 실패 repo 기록

## 3. Repository naming rule

기본 naming pattern은 다음이다.

```txt
{season}-w{week}-c{class}-{teamNumber}
```

예시:

```txt
2026-summer-w1-c1-01
2026-summer-w2-c3-07
2026-summer-w3-c4-05
```

이름에서 파싱해야 하는 값:

- season: `2026-summer`
- week: `1`, `2`, `3`, `4` ...
- class: `1`, `2`, `3`, `4` ...
- teamNumber: `01`, `02` ...

관리자 설정에서 pattern을 바꿀 수 있게 하되, MVP에서는 위 pattern을 우선 지원하라.

## 4. 아키텍처 우선순위

가능하면 서버리스 또는 매우 가벼운 구조로 만든다.

### 1순위: Static Snapshot Mode

- GitHub Actions cron 또는 수동 sync script가 GitHub API를 호출한다.
- 집계 결과를 JSON snapshot으로 만든다.
- Next.js frontend는 snapshot JSON을 읽어 화면을 보여준다.
- DB 없이도 동작한다.
- 가장 가볍고 유지보수가 쉽다.

### 2순위: Docker PostgreSQL Mode

DB가 필요하면 Supabase를 사용하지 말고 Docker Compose 기반 PostgreSQL을 사용한다.

- `docker-compose.yml`에 `app`, `postgres` 서비스 구성
- Prisma 또는 Drizzle 사용 가능
- GitHub sync job은 Next.js route handler, CLI script, 또는 별도 worker로 구현
- PostgreSQL에는 raw commits, sync runs, aggregated stats를 저장

둘 중 하나만 완성해도 되지만, 설계상 둘 다 가능하도록 구조를 분리하라. MVP는 Static Snapshot Mode를 우선한다. PostgreSQL 모드는 snapshot만으로 한계가 있을 때 추가한다.

## 5. 기술 스택 제약

- Next.js + TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- Recharts
- zod
- date-fns 또는 dayjs 중 하나
- 테스트: Vitest, Testing Library, Playwright
- property-based fuzzing: fast-check
- API fuzzing: OpenAPI 스키마가 있으면 Schemathesis 사용
- 보안 baseline: OWASP ZAP baseline scan 가능하게 구성
- DB가 필요하면 PostgreSQL + Docker Compose
- Supabase 금지

새로운 UI 라이브러리를 임의로 추가하지 마라.

## 6. UI 컴포넌트 규칙

shadcn/ui 기반으로 다음 공통 컴포넌트를 만들어 재사용하라.

- AppShell
- TopNav
- PageHeader
- WeekSelector
- SyncStatusBadge
- MetricCard
- FilterBar
- LeaderboardTable
- LeaderboardRow
- CompactTopThree
- ActivityFeed
- ActivityFeedItem
- ContributionHeatmap
- TrendChart
- EmptyState
- ErrorState
- AdminSettingCard
- AdminSyncPanel
- ParticipantDetailPanel
- TeamDetailPanel

새로운 버튼 스타일, 카드 스타일, 테이블 스타일을 제멋대로 만들지 마라. 디자인 토큰과 공통 컴포넌트를 확장해서 일관성을 유지하라.

## 7. 디자인 품질 기준

절대 다음처럼 보이면 안 된다.

- AI-generated cyber dashboard
- 코인/보상 앱
- NFT/game reward UI
- 과한 네온 cyan/glow
- 큰 hero section
- 의미 없는 장식 아이콘
- 과한 gradient
- 해커톤 홍보 랜딩페이지
- 실제로는 쓸 수 없어 보이는 사짜 대시보드

반드시 다음처럼 보여야 한다.

- 개발자가 매일 볼 수 있는 GitHub activity dashboard
- Duolingo dark leaderboard 같은 생동감
- GitHub contribution graph 같은 명확한 활동 표시
- Linear/Vercel 같은 미니멀하고 신뢰감 있는 UI
- Grafana/Datadog 같은 정확한 운영 정보
- Top 3, badge, rank change에만 가벼운 게임성

애니메이션은 충분히 넣어라. 단, cheap glow가 아니라 제품형 micro-interaction이어야 한다.

필수 애니메이션:

- metric number count-up
- rank row enter animation
- rank up/down micro animation
- hover 시 row lift / highlight
- heatmap cell hover tooltip
- sync status pulse
- recently updated feed item slide-in
- compact top 3 reveal
- tab transition
- mobile sheet transition

prefers-reduced-motion를 존중하라.

## 8. 기능 요구사항

### Public dashboard

- 현재 주차 자동 표시
- 전체 기간 선택 가능
- 특정 주차 선택 가능
- 개인 / 팀 / 분반 탭
- 분반 랭킹은 인당 평균이 기본, 총합 토글 제공
- 오늘의 활동은 메인 탭이 아니라 보조 위젯
- GitHub contribution heatmap
- 최근 활동 feed
- compact Top 3 highlight
- KST 기준 안내 표시

### Admin dashboard

관리자 설정은 간단해야 한다.

- GitHub Organization 설정
- token/API secret 입력 방식 안내
- season 설정
- 주차 개수 및 KST 시작/종료 시각 설정
- 분반 개수 설정
- 참가자 CSV 업로드/검증
- repository discovery 결과 확인
- 수동 sync 실행
- 마지막 sync 상태 확인
- GitHub API rate limit 확인
- 실패 repo 목록 확인
- 일간 활동 위젯 공개 여부 on/off
- badge 기능 on/off

### Data sync

- GitHub Organization repository 목록을 불러온다.
- naming pattern으로 repo metadata를 파싱한다.
- 설정된 season에 해당하는 repo만 추적한다.
- 주차별 KST startAt/endAt 기준으로 commit을 필터링한다.
- commit author를 participant CSV의 GitHub username과 매핑한다.
- 참가자 CSV에 없는 외부 계정은 `unmapped`로 별도 표시하고 운영진에게 알려준다.
- API rate limit을 저장/표시한다.
- 실패해도 기존 snapshot 또는 기존 DB 값을 보여준다.

## 9. 품질 요구사항

구현 완료 전 아래 명령이 모두 통과해야 한다.

- package install
- format check
- lint
- typecheck
- unit test
- property-based fuzz test
- e2e test
- build
- Docker build
- Docker compose smoke test
- security audit
- dependency check
- ZAP baseline scan, 가능한 경우

lint는 무조건 통과해야 한다. TypeScript error도 0개여야 한다.

## 10. 테스트 요구사항

최소 테스트 범위:

- repo naming parser
- KST week resolver
- CSV parser/validator
- GitHub username mapper
- commit aggregation
- class ranking average/total toggle
- unknown user 처리
- duplicate commit SHA deduplication
- rate limit 상태 저장
- snapshot fallback
- admin config validation
- UI critical rendering
- mobile responsive e2e

fuzzer 요구:

- fast-check로 repo naming parser fuzzing
- fast-check로 CSV parser fuzzing
- fast-check로 KST date boundary fuzzing
- fast-check로 aggregation invariant 검사
- OpenAPI 스키마가 있으면 Schemathesis로 API fuzzing

Sanitizer 요구:

- TypeScript/Node 기반이므로 C/C++의 ASan/UBSan 같은 sanitizer는 기본 적용 대상이 아니다.
- 대신 runtime validation(zod), strict TypeScript, eslint, dependency audit, ZAP baseline, property-based fuzzing을 sanitizer 역할로 사용한다.
- native addon을 추가했다면 sanitizer build를 추가하라. 가능하면 native addon을 추가하지 마라.

## 11. 성능/캐싱 요구사항

- GitHub API 직접 호출은 frontend request path에서 하지 마라.
- sync job에서만 GitHub API를 호출하라.
- public frontend는 snapshot/DB의 aggregate만 읽게 하라.
- ETag/Last-Modified 또는 conditional request를 활용할 수 있으면 사용하라.
- repo별 마지막 sync cursor를 저장하라.
- commit SHA deduplication을 반드시 하라.
- snapshot JSON은 정적 캐싱 가능하게 하라.
- Next.js route는 cache header를 명확히 설정하라.
- 큰 데이터는 필요한 범위만 내려라.
- UI에서 row virtualization은 필요할 때만 도입하라.

## 12. Tailscale preview

모든 기능 구현, lint/typecheck/test/build 통과 후, 마지막에 Tailscale로 접속 가능한 UI preview를 열어라.

요구:

- Docker compose 또는 Next.js dev/prod server를 `0.0.0.0`에 bind
- 외부 public 공개가 아니라 Tailscale 내부망 접근을 우선
- `tailscale ip -4`로 접근 주소 확인
- README에 접속 방법 작성
- 가능한 경우 방화벽은 Tailscale interface만 허용

예시:

```bash
docker compose up -d --build
pnpm preview --host 0.0.0.0
# 또는
HOSTNAME=0.0.0.0 PORT=3000 pnpm start
```

## 13. 작업 방식

1. 현재 repository 분석
2. 두 디자인 ZIP 압축 해제 및 비교
3. 기존 코드/디자인 중 쓸 수 있는 부분 선별
4. SDD에 맞는 아키텍처 결정
5. config schema 구현
6. participant CSV validator 구현
7. GitHub repo discovery 구현
8. GitHub commit sync 구현
9. aggregation 구현
10. snapshot 또는 PostgreSQL 저장 구현
11. UI 리디자인
12. admin dashboard 구현
13. 애니메이션 및 micro-interaction 구현
14. tests/fuzz/e2e/security 구현
15. 최적화/캐싱 구현
16. Docker/Tailscale preview 구성
17. README 및 운영 문서 작성

각 단계마다 작동 확인하고, 마지막에는 모든 체크가 통과해야 한다.


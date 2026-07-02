# 몰입 랭킹 서비스 구현 및 운영 검증 보고서

작성일: 2026-06-28  
대상 서비스: MadCamp GitHub Activity Leaderboard

## 1. 서비스 개요

몰입 랭킹은 몰입캠프 참가자의 GitHub 활동을 집계해 공개 리더보드로 보여주는 서비스다. 공개 페이지는 참가자가 보는 읽기 전용 대시보드이고, 관리자 기능은 `/admin`으로 분리되어 시즌 설정, 주차 설정, 참가자 CSV, GitHub 동기화를 관리한다.

공개 페이지는 GitHub API를 직접 호출하지 않는다. GitHub 데이터는 서버 측 동기화 작업에서 snapshot JSON으로 생성하고, 공개 대시보드는 해당 snapshot만 읽는다. 이 구조를 통해 공개 사용자가 임의로 동기화를 실행하거나 GitHub API rate limit을 소모하지 않도록 설계했다.

현재 production build를 `next start -H 0.0.0.0 -p 3000`으로 실행하여 로컬/서버 환경에서 production mode 동작을 검증했다.

## 2. 기술 스택

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 스타일 컴포넌트
- lucide-react
- Recharts
- zod
- Vitest
- fast-check
- Playwright

## 3. 주요 파일 구조

| 영역                   | 파일                                             |
| ---------------------- | ------------------------------------------------ |
| 공개 홈                | `app/page.tsx`                                   |
| 관리자 설정 페이지     | `app/admin/page.tsx`                             |
| 관리자 동기화 페이지   | `app/admin/sync/page.tsx`                        |
| 관리자 로그인          | `app/admin/login/page.tsx`                       |
| 관리자 보호 middleware | `middleware.ts`                                  |
| 시즌/주차 설정         | `config/madcamp.config.json`                     |
| 참가자 CSV             | `src/participants/participants.sample.csv`       |
| GitHub 동기화 runner   | `src/sync/sync-runner.ts`                        |
| 집계 로직              | `src/aggregation/aggregate.ts`                   |
| GitHub repo discovery  | `src/github/discover-repos.ts`                   |
| 참가자 CSV parser      | `src/participants/parse-participants.ts`         |
| 관리자 인증 유틸       | `src/auth/admin.ts`, `src/auth/admin-session.ts` |
| commit ledger          | `data/commits/*.jsonl`                           |
| sync report            | `data/sync-reports/latest.json`                  |

## 4. 데이터 흐름

1. 관리자가 `/admin`에서 시즌, 주차, 랭킹 옵션, 참가자 CSV를 설정한다.
2. 설정은 `config/madcamp.config.json`에 atomic write 방식으로 저장된다.
3. 참가자 CSV는 검증 후 `src/participants/participants.sample.csv`에 atomic write 방식으로 저장된다.
4. GitHub 동기화 runner가 `GITHUB_TOKEN`으로 organization repository 목록을 조회한다.
5. repository 이름이 `{season}-w{week}-c{class}-{teamNumber}` 패턴과 맞는지 검사한다.
6. 설정된 KST 주차 구간 안의 commit을 수집한다.
7. commit author를 참가자 CSV와 매핑한다. GitHub login 매칭을 우선하고, 매칭 실패 시 commit author email로 fallback 매칭한다.
8. repo + sha 기준으로 commit을 dedupe한다.
9. commit ledger를 JSONL로 저장한다.
10. sync report를 저장한다.
11. sync가 완전 성공한 경우에만 개인, 팀, 분반 랭킹과 활동 feed, heatmap/chart 데이터를 생성한다.
12. 완전 성공한 경우에만 `public/data/snapshots/latest.json`을 갱신한다.
13. partial 또는 failed sync에서는 기존 latest snapshot을 유지한다.
14. 공개 대시보드는 GitHub API를 호출하지 않고 snapshot JSON만 읽어 렌더링한다.

## 5. 공개 페이지 기능

공개 홈은 운영자가 아닌 일반 사용자를 위한 읽기 전용 화면이다.

제공 기능:

- 이번 주 활동 리더보드
- 개인 / 팀 / 분반 랭킹 탭
- 이번 주 커밋 수
- 활성 repository 수
- 참여자 수
- 가장 활발한 팀
- 최근 GitHub 활동 feed
- 오늘의 활동 요약
- 일별 커밋 bar chart
- 4주 sprint heatmap
- team race bar
- 참가자 상세 페이지
- 팀 상세 페이지
- 과거 주차 조회
- 아직 시작하지 않은 주차 선택 제한

공개 페이지에서 제거한 항목:

- 관리자 페이지 링크
- 수동 동기화 버튼
- GitHub API rate limit 노출
- CSV 기준 등 내부 구현 기준 문구
- 공개 사용자가 API sync를 유발할 수 있는 UI

## 6. 관리자 기능

관리자는 `/admin/login`에서 `ADMIN_TOKEN`으로 로그인한다. 로그인 성공 시 httpOnly session cookie가 발급되며, `/admin` 하위 페이지는 middleware에서 보호된다.

관리자 기능:

- 시즌 ID 수정
- 표시 이름 수정
- GitHub organization 수정
- repository naming pattern 수정
- 분반 수 수정
- 현재 주차 override 설정
- 랭킹 옵션 수정
- 주차 시작/종료 시간 수정
- 주차 집계 포함 여부 수정
- 참가자 CSV 업로드 및 저장
- GitHub rate limit 조회
- repository discovery 실행
- dry-run sync 실행
- 현재 주차 GitHub sync 실행
- 최신 sync report 기반 동기화 무결성 확인

관리자 API:

| Method | Path                             | 기능                        |
| ------ | -------------------------------- | --------------------------- |
| POST   | `/api/admin/session`             | 관리자 로그인 세션 생성     |
| DELETE | `/api/admin/session`             | 관리자 로그아웃             |
| GET    | `/api/admin/config`              | 현재 설정 조회              |
| PATCH  | `/api/admin/config`              | 설정 저장                   |
| GET    | `/api/admin/discovery`           | GitHub repository discovery |
| GET    | `/api/admin/rate-limit`          | GitHub API rate limit 조회  |
| POST   | `/api/admin/sync`                | GitHub 동기화 실행          |
| POST   | `/api/admin/upload-participants` | 참가자 CSV 검증 및 저장     |

관리자 API는 session cookie 또는 `Authorization: Bearer $ADMIN_TOKEN` 방식으로 인증한다.

## 7. 보안 및 운영 기준

적용된 기준:

- 공개 대시보드는 읽기 전용이다.
- 관리자 화면은 `/admin`으로 분리되어 있다.
- `/admin`은 middleware로 보호된다.
- `ADMIN_TOKEN`이 없으면 관리자 접근이 허용되지 않는다.
- 관리자 session cookie는 httpOnly로 설정된다.
- production 환경에서는 secure cookie가 사용된다.
- 관리자 API는 인증 없이는 401을 반환한다.
- GitHub token이 없으면 sync/rate-limit API는 안전하게 실패한다.
- 공개 request path에서는 GitHub API를 호출하지 않는다.
- 설정 저장은 atomic write로 처리한다.
- 참가자 CSV 저장도 atomic write로 처리한다.
- 참가자 CSV는 파싱 검증 후 저장한다.
- CSV 저장 시 업로드 원문 byte를 보존한다.
- 참가자 CSV는 `name,identifier,class` 형식을 권장한다.
- `identifier`는 GitHub ID 또는 commit email이며 parser가 자동 판별한다.

주의 사항:

- 현재 설정과 참가자 데이터는 파일 기반으로 저장된다.
- 직접 운영하는 Node 서버 또는 persistent filesystem 환경에서는 운영 가능하다.
- Vercel 같은 immutable/serverless runtime에서는 런타임 파일 write가 유지되지 않을 수 있다.
- serverless 배포가 필요하면 config/participants/snapshot write layer를 DB, S3, Git-backed storage 등 durable storage로 옮겨야 한다.
- 장기적으로는 source code와 runtime data를 분리해야 한다. `src/participants/participants.sample.csv`는 sample로 유지하고, 실제 운영 데이터는 `data/participants/participants.csv` 같은 runtime data 경로로 옮기는 구조가 더 적합하다.

권장 runtime data 구조:

```txt
data/
├─ config/madcamp.config.json
├─ participants/participants.csv
├─ snapshots/latest.json
└─ sync-state.json
```

## 8. GitHub 동기화 방식

동기화는 `src/sync/sync-runner.ts`에서 수행된다.

동기화 과정:

1. `config/madcamp.config.json` 로드
2. `src/participants/participants.sample.csv` 로드
3. `GITHUB_TOKEN` 확인
4. GitHub organization repository 목록 조회
5. repository 이름 패턴 파싱
6. enabled week와 classCount 기준 필터링
7. 각 repository의 default branch commit 조회
8. KST 주차 기간 기준 commit 수집
9. author login을 참가자 CSV와 매핑
10. GitHub login 매칭 실패 시 commit author email로 fallback 매핑
11. unknown user 기록
12. repo + sha 기준 dedupe
13. `data/commits/{season}-w{week}.jsonl` commit ledger 저장
14. `data/sync-reports/latest.json` sync report 저장
15. sync report status가 `success`이면 ranking snapshot 생성
16. success인 경우에만 `public/data/snapshots/latest.json` 저장
17. partial 또는 failed인 경우 기존 latest snapshot 유지
18. `.cache/sync-state.json` 갱신

동기화 설계 원칙:

- 랭킹 source of truth는 GitHub, config, 참가자 CSV, week window다.
- 가능하면 매 sync마다 현재 주차 대상 repo commit을 다시 읽고 snapshot을 재계산한다.
- `.cache/sync-state.json`은 증분 계산의 진실 원천이 아니라 운영 상태 기록으로 사용한다.
- 같은 config, 같은 CSV, 같은 GitHub 상태라면 언제 sync를 돌려도 같은 snapshot이 생성되어야 한다.
- 진행 중인 주차는 매 sync마다 주차 기간 내 commit을 다시 읽고 ledger에서 랭킹을 재계산한다.

Sync report status:

| Status            | 의미                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `success`         | 대상 repo 조회, pagination, author 매핑, snapshot 생성이 모두 정상    |
| `partial_success` | 일부 repo 실패, unknown author, discovery warning 등 무결성 경고 존재 |
| `failed`          | 모든 대상 repo 실패 또는 sync 자체 실패                               |

`partial_success`와 `failed`는 공개 latest snapshot을 덮어쓰지 않는다. 운영자는 관리자 동기화 화면의 무결성 카드와 sync report를 보고 원인을 확인한다.

동기화 API는 관리자가 수동 실행할 수 있지만, 공개 페이지에는 노출되지 않는다. 운영에서는 10분 주기 자동 실행을 기본 전제로 한다.

## 9. 테스트 및 품질 검증

검증 명령:

```bash
npx pnpm@10.25.0 format:check
npx pnpm@10.25.0 lint
npx pnpm@10.25.0 typecheck
npx pnpm@10.25.0 coverage:core
npx pnpm@10.25.0 test:e2e
npx pnpm@10.25.0 build
```

검증 결과:

| 항목             | 결과      |
| ---------------- | --------- |
| format check     | 통과      |
| lint             | 통과      |
| typecheck        | 통과      |
| production build | 통과      |
| Playwright e2e   | 8개 통과  |
| core coverage    | 100% 통과 |

Core coverage 결과:

| 지표       | 결과 |
| ---------- | ---- |
| Statements | 100% |
| Branches   | 100% |
| Functions  | 100% |
| Lines      | 100% |

Core coverage 대상:

- config schema
- config writer
- participant CSV parser
- participant schema
- repo parser
- repo discovery
- aggregation
- admin session utility
- snapshot fallback
- sync state
- author mapping

UI 컴포넌트와 shadcn/ui 전체까지 100% coverage 대상으로 잡지는 않았다. 운영 실패를 만들 수 있는 production-critical core 로직을 100% coverage 대상으로 설정했다.

## 10. 실제 production 동작 검증

`next build` 후 `next start -H 0.0.0.0 -p 3000`으로 production mode 검증 서버를 실행한 상태에서 HTTP 통합 검증을 수행했다.

검증 결과:

| 검증 항목                            | 결과                         |
| ------------------------------------ | ---------------------------- |
| 공개 홈 접근                         | `200`                        |
| `/admin` 비로그인 접근               | `307` redirect               |
| redirect 위치                        | `/admin/login?next=%2Fadmin` |
| `/api/admin/config` 비인증 접근      | `401`                        |
| 잘못된 관리자 토큰 로그인            | `401`                        |
| 올바른 관리자 토큰 로그인            | `200`                        |
| 세션 쿠키로 `/admin` 접근            | `200`                        |
| config patch 실제 저장               | `200`                        |
| config restore 후 hash 일치          | yes                          |
| participant CSV upload 실제 저장     | `200`                        |
| participant CSV 파일 변경 확인       | yes                          |
| participant CSV restore 후 hash 일치 | yes                          |
| `GITHUB_TOKEN` 미설정 시 rate-limit  | `503`                        |
| `GITHUB_TOKEN` 미설정 시 sync        | `503`                        |
| `name,identifier` CSV 업로드         | `200`                        |
| email identifier 자동 판별           | 확인                         |
| CSV 원복 후 hash 일치                | yes                          |

동기화 실패 메시지:

```txt
GITHUB_TOKEN is required for GitHub sync
```

이는 `GITHUB_TOKEN`이 없는 환경에서 안전하게 실패하는 동작이다.

## 11. 현재 한계

1. 실제 GitHub API 동기화는 `GITHUB_TOKEN`이 필요하다.

현재 검증 환경에는 `GITHUB_TOKEN`이 없어서 GitHub 외부 API까지 연결되는 discovery/sync는 수행하지 못했다. 다만 토큰이 없을 때 안전하게 실패하는 것은 확인했다.

2. 파일 기반 저장 방식이다.

현재 admin write는 local filesystem에 저장한다. persistent Node server에서는 작동하지만, immutable/serverless runtime에서는 유지되지 않을 수 있다.

3. 실운영 자동 스케줄러 확인이 필요하다.

동기화 runner와 관리자 수동 실행은 구현되어 있다. 실제 운영에서는 GitHub Actions, cron, systemd timer, container scheduler 중 하나로 10분 주기 실행을 확정해야 한다.

## 12. 참가자 CSV 설계

운영 CSV는 복잡하게 만들지 않고 다음 형식을 권장한다.

```csv
name,identifier,class
박지민,jshskaist31,1
김철수,kimcs,1
이영희,younghee@example.com,2
최민수,minsu123,2
```

설계 원칙:

- `identifier`에 `@`가 있으면 email로 판별한다.
- `identifier`에 `@`가 없으면 GitHub ID로 판별한다.
- GitHub ID는 소문자로 정규화해 비교한다.
- email도 소문자로 정규화해 비교한다.
- GitHub ID 매칭을 우선한다.
- GitHub ID 매칭에 실패하거나 `author.login`이 없으면 commit author email로 fallback 매칭한다.
- email은 실제 commit email과 일치해야 개인 랭킹에 반영된다.

CSV 검증 규칙:

- `name`은 비어 있으면 안 된다.
- `identifier`는 비어 있으면 안 된다.
- `identifier`는 GitHub ID 또는 email 형식이어야 한다.
- 같은 identifier가 두 번 나오면 에러다.
- 같은 name이 두 번 나오면 warning을 남긴다.
- 기존 `github_username` 컬럼은 backward compatibility로 지원한다.

관리자 안내 문구:

```txt
identifier에는 GitHub ID 또는 GitHub commit email 중 하나를 입력할 수 있습니다.
GitHub ID 입력을 권장합니다.
email을 입력한 경우 실제 commit author email과 일치해야 랭킹에 반영됩니다.
```

## 13. 운영 보완 우선순위

P0. 운영 전 필수:

- `GITHUB_TOKEN` 주입 후 실제 organization discovery/sync 검증
- snapshot 손상/실패 대비 fallback 구조
- unknown author 및 bot-only commit 관리자 표시
- KST boundary test 강화
- runtime data 위치를 `src`/`public` 밖의 `data` 또는 durable storage로 분리
- 마지막 업데이트 시각 공개 표시
- sync 결과 로그 저장

P1. 강력 추천:

- timestamped snapshot 보존
- CSV diff preview
- repo discovery 문제 분류
- GitHub API rate limit budget 표시
- audit log
- duplicate GitHub ID/identifier 검증
- upload size limit 및 row/column 제한

P2. 있으면 좋은 항목:

- commit quality score
- PR/issue activity 반영
- 팀별 activity matrix
- Slack/Discord 알림
- snapshot rollback UI

## 14. AI/Bot Commit Attribution 정책

AI agent 또는 bot이 만든 commit도 commit ledger에는 그대로 저장한다. 단, 개인 랭킹에는 참가자와 연결 가능한 경우만 반영한다.

Commit ledger에 저장하는 attribution 정보:

- author login/name/email
- committer login/name/email
- commit message summary
- `Co-authored-by` trailer에서 파싱한 co-author name/email
- 감지된 bot identity
- 매칭된 참가자 목록
- 참가자별 match source
- attribution status

Attribution status:

| Status                  | 의미                                     | 개인 랭킹 반영                |
| ----------------------- | ---------------------------------------- | ----------------------------- |
| `single_participant`    | 참가자 1명과 매칭됨                      | 해당 참가자 +1                |
| `multiple_participants` | author/co-author 등 여러 참가자와 매칭됨 | 매칭된 각 참가자 +1           |
| `bot_with_participant`  | bot/AI commit이지만 참가자와 연결됨      | 매칭된 참가자 +1              |
| `bot_only`              | bot/AI만 있고 참가자 정보 없음           | 미반영, 팀 랭킹에는 반영      |
| `unknown`               | 참가자와 연결 불가                       | 미반영, 팀 랭킹에는 반영 가능 |

매칭 우선순위:

1. author login
2. author email
3. committer login
4. committer email
5. `Co-authored-by` email

Bot 감지 기준:

- `[bot]`
- `github-actions`
- `dependabot`
- `renovate`
- `copilot`
- `codex`
- `claude`
- `cursor`
- `anthropic`
- `openai`

랭킹 정책:

- 팀 랭킹은 repo에 존재하는 모든 commit을 1개씩 반영한다.
- 개인 랭킹은 참가자와 매칭 가능한 commit만 반영한다.
- 공동 작성 commit은 매칭된 각 참가자에게 1 commit으로 반영한다.
- AI bot only commit은 개인 랭킹에 반영하지 않는다.
- bot/unknown commit은 관리자 sync report에서 별도 확인한다.

공개 안내 문구 권장:

```txt
공동 작성 commit은 각 공동 작성자의 개인 활동에 반영됩니다.
따라서 개인 commit 수 합계는 팀 commit 수와 다를 수 있습니다.
AI/bot only commit은 팀 활동에는 반영되지만, 참가자와 연결되지 않으면 개인 랭킹에는 반영되지 않습니다.
```

## 15. 운영 실패 시나리오 및 대응

1. `GITHUB_TOKEN` 만료

- 증상: sync/rate-limit API 503 또는 GitHub 401
- 영향: 기존 snapshot은 유지되지만 랭킹이 최신화되지 않음
- 대응: token 교체 후 sync 재실행

2. GitHub rate limit 소진

- 증상: sync 실패 또는 일부 repo 누락
- 영향: latest snapshot 갱신 중단
- 대응: sync 주기 완화, repo 필터링, conditional request 적용 검토

3. participant CSV 오류

- 증상: unknown author 증가, 특정 참가자 누락
- 영향: 개인 랭킹 부정확
- 대응: CSV restore, identifier 수정, alias/email fallback 확인

4. snapshot 파일 손상

- 증상: 공개 페이지가 latest snapshot을 읽지 못함
- 영향: 최신 랭킹 대신 이전 snapshot 또는 safe empty snapshot 필요
- 대응: `latest.backup.json`, timestamp snapshot, safe fallback 구조 도입

5. repo naming mismatch

- 증상: 특정 팀 repo가 집계되지 않음
- 영향: 팀 랭킹 누락
- 대응: repo rename 또는 naming pattern 수정, discovery 문제 분류 화면 확인

## 16. 추가 권장 설계

Snapshot 저장:

- 현재 commit ledger와 sync report는 저장한다.
- 현재 latest snapshot은 success sync에서만 갱신한다.
- 다음 보완으로 timestamped snapshot과 `latest.backup.json`을 함께 남기는 것이 좋다.
- 새 snapshot은 zod schema 검증 후 임시 파일에 쓰고 atomic rename으로 교체하는 것이 좋다.
- 공개 페이지는 `latest.json -> latest.backup.json -> 최근 timestamp snapshot -> safe empty snapshot` 순서로 fallback하는 것이 좋다.

관리자 운영 UX:

- unknown authors
- bot with participant
- bot only
- missing expected repos
- unmatched repos
- duplicate participants
- duplicate identifiers
- snapshot age warning
- GitHub API remaining budget
- sync duration
- checked repos / skipped repos
- commits scanned

Audit log 대상:

- 로그인 성공/실패
- config 변경
- participant CSV 업로드
- discovery 실행
- sync 실행
- snapshot 생성 성공/실패

GitHub token 권한:

- 랭킹 서비스 token은 read-only fine-grained token을 권장한다.
- repository metadata/contents read 권한만 부여한다.
- repo 생성, team 생성, invite 발송 같은 provisioning token은 분리해야 한다.
- ranking service와 provisioning service는 실행 흐름과 audit log를 분리하는 것이 안전하다.

랭킹 기준 공개:

공개 페이지 또는 FAQ에는 최소한 다음 기준을 안내하는 것이 좋다.

```txt
랭킹은 각 주차 기간 동안 GitHub repository에 기록된 commit을 기준으로 자동 집계됩니다.
GitHub 계정 또는 commit email이 참가자 명단과 매칭되지 않은 commit은 개인 랭킹에 반영되지 않을 수 있습니다.
집계 오류가 의심되면 운영진에게 문의해주세요.
```

## 17. 운영 전 체크리스트

- `ADMIN_TOKEN`을 예측 불가능한 강한 값으로 설정한다.
- `GITHUB_TOKEN`을 organization repository read 권한으로 설정한다.
- 10분 주기 sync job을 운영 환경에 등록한다.
- runtime filesystem이 persistent인지 확인한다.
- serverless 배포라면 durable storage 전환 후 배포한다.
- `/admin`이 외부에 노출되는 경우 HTTPS 환경에서만 사용한다.
- snapshot backup 또는 rollback 정책을 정한다.
- 참가자 CSV 변경 이력을 별도로 보존할지 결정한다.
- unknown author 처리 프로세스를 정한다.
- bot-only commit 처리 정책을 운영진에게 공유한다.
- GitHub token 권한을 ranking read-only와 provisioning admin으로 분리한다.
- 실제 GitHub organization을 대상으로 discovery/dry-run/sync를 검증한다.

## 18. 결론

현재 서비스는 공개 대시보드와 관리자 기능이 분리되어 있으며, 공개 페이지는 GitHub API를 직접 호출하지 않는 snapshot 기반 구조로 구현되어 있다. 관리자 기능은 실제 설정 파일과 참가자 CSV를 저장하며, 인증과 session cookie 기반 보호가 적용되어 있다.

검증 결과, production build와 production mode 검증 서버 환경에서 공개 접근, 관리자 인증, 설정 저장, 참가자 CSV 저장, 원복, 비인증 차단, token 미설정 시 안전 실패가 모두 확인되었다.

단, 실제 GitHub organization을 대상으로 한 discovery/sync 검증은 `GITHUB_TOKEN`이 주입된 운영 환경에서 추가 확인이 필요하다. 또한 serverless 환경에 배포하려면 파일 기반 저장을 durable storage로 전환해야 한다.

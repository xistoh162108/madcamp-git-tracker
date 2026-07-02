# MadCamp GitHub Activity Leaderboard SDD Pack

이 ZIP은 Codex/Claude Code에게 넘기기 위한 SDD 문서 묶음입니다.

## 포함 문서

1. `00_CODEX_MASTER_PROMPT.md`  
   Codex에게 그대로 붙여 넣을 최상위 작업 지시서입니다.

2. `01_SDD.md`  
   서비스 목표, 요구사항, 아키텍처, 데이터 모델, 동기화, UI/UX, 테스트/보안까지 포함한 상세 SDD입니다.

3. `02_IMPLEMENTATION_PLAN.md`  
   단계별 구현 순서, 체크포인트, 완료 조건입니다.

4. `03_DESIGN_DIRECTION.md`  
   v0/Figma Make 디자인 ZIP을 참고해 리디자인하는 지시서입니다.

5. `04_DATA_AND_SYNC_SPEC.md`  
   GitHub API 수집, repo discovery, KST 주차 집계, 캐싱 전략 문서입니다.

6. `05_TESTING_QUALITY_SECURITY.md`  
   lint, typecheck, unit/e2e/property-based fuzzing, API fuzzing, 보안 스캔, sanitizer 대응 문서입니다.

7. `06_TAILSCALE_PREVIEW.md`  
   최종 완료 후 Tailscale 내부망으로 UI를 preview하는 지시서입니다.

## 중요한 전제

- 관리자는 GitHub Organization 접근 토큰/API 정보, 캠프 주차/분반 수, 참가자 이름-GitHub 계정 CSV만 제공합니다.
- 주차별 repo 추적 대상은 서비스가 GitHub Organization의 repository 목록과 naming rule을 바탕으로 자동 discovery합니다.
- Supabase는 사용하지 않습니다.
- DB가 필요하면 Docker Compose 기반 PostgreSQL을 사용합니다.
- 기본 구현은 가능한 한 가볍게 유지하고, static snapshot 기반 또는 Next.js + PostgreSQL Docker 모드를 선택할 수 있게 합니다.
- 디자인은 절대 AI-generated cyber dashboard처럼 보이면 안 됩니다.
- UI는 Duolingo dark leaderboard처럼 살아있고 인터랙티브하되, GitHub/Linear/Vercel/Grafana 계열의 신뢰감 있는 developer analytics dashboard여야 합니다.

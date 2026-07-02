몰입캠프 GitHub 활동 리더보드 웹사이트를 다시 디자인해줘.

현재 시안은 너무 AI-generated cyber dashboard처럼 보인다. 과한 네온, 큰 Hero 영역, 장식적인 podium, 의미 없는 glow, 과도한 gradient를 줄이고, 실제 개발자들이 매일 사용할 수 있는 신뢰감 있는 GitHub analytics dashboard처럼 재설계해줘.

전체 UI 문구는 반드시 한국어로 작성한다.

## 제품 목표

이 서비스는 MadCamp 참가자들의 GitHub repository 활동을 기반으로 개인, 팀, 분반별 활동 흐름을 보여주는 인터랙티브 리더보드다.

목적은 참가자를 감시하거나 평가하는 것이 아니라, 캠프 분위기를 게임처럼 조금 더 재미있게 만들고, 각 팀과 분반의 개발 흐름을 한눈에 보여주는 것이다.

목표는 다음과 같다.

“GitHub contribution graph + developer analytics dashboard + compact game leaderboard”

즉, 예쁜 랜딩페이지가 아니라 실제로 사용할 수 있는 개발자 활동 대시보드여야 한다.

첫 화면을 봤을 때 다음이 바로 보여야 한다.

1. 지금 몇 주차인지
2. 마지막 동기화 시간이 언제인지
3. 이번 주 누가/어느 팀/어느 분반이 가장 활발한지
4. 전체 순위가 어떻게 되는지
5. 날짜별 GitHub 활동 흐름이 어떤지

## 디자인 레퍼런스 방향

다음 레퍼런스 방향을 통합해서 사용해라.

### 메인 레퍼런스

두 번째 레퍼런스처럼 다음 느낌을 메인으로 삼아라.

- dark mode 기반
- contribution heatmap
- information-dense leaderboard
- 차분한 카드형 랭킹 리스트
- 실제 활동 추적 제품 같은 분위기
- GitHub repository insights / contribution graph 느낌
- Linear의 정돈된 issue dashboard 느낌
- Vercel dashboard의 미니멀한 dark UI 느낌
- Grafana 또는 Datadog의 monitoring dashboard 정보 구조
- Mobbin의 leaderboard/dashboard screen pattern
- shadcn/ui dashboard blocks

### 보조 레퍼런스

첫 번째 레퍼런스는 다음 요소에만 제한적으로 참고해라.

- compact Top 3 highlight
- 랭킹의 재미
- 상위권을 한눈에 보여주는 구조

단, 첫 번째 레퍼런스를 전체 UI에 적용하지 마라. 캐릭터 중심, 포인트 앱, 보상 앱, NFT 게임, 코인 대시보드처럼 보이면 안 된다.

비율은 다음처럼 잡아라.

- 두 번째 레퍼런스: 80%
- 첫 번째 레퍼런스: 20%

## 중요한 디자인 방향

1. 게임 느낌은 유지하되, 전체 UI를 게임처럼 만들지 말 것
2. 랭킹 상승/하락, badge, Top 3 정도에만 가볍게 게임성을 넣을 것
3. 전체 구조는 실제 제품형 analytics dashboard처럼 만들 것
4. Hero 영역을 줄이고, 메인 리더보드를 화면의 주인공으로 만들 것
5. 정보 밀도를 높이고, 의미 없는 큰 카드와 빈 공간을 줄일 것
6. 네온 cyan/glow 사용을 최소화할 것
7. 카드 border는 얇고 차분하게, 배경은 절제된 dark surface로 만들 것
8. Typography hierarchy를 정리해서 숫자, 이름, 설명의 우선순위가 분명하게 보이게 할 것
9. Top 3 podium은 과한 장식이 아니라 compact summary card 또는 leaderboard 상단 강조 row로 처리할 것
10. 관리자/동기화 정보는 운영 대시보드처럼 작고 정확하게 보여줄 것

## 전체 레이아웃

기존처럼 큰 Hero 영역을 두지 마라. Hero는 compact header 수준으로 줄여라.

### 상단 navigation

상단에는 다음 항목을 배치한다.

- 앱 이름: 몰입 랭킹
- 기수: 2026 여름학기
- 현재 주차: 2주차 · 진행 중
- 마지막 동기화 시간
- 동기화 버튼
- 관리자 버튼

상단 navigation은 너무 크지 않고, 실제 제품의 top bar처럼 compact하게 만들어라.

### compact season/week selector

주차 선택은 관리자 설정에서 불러온 주차 목록을 기반으로 보여줘야 한다.

예시:

- 전체 기간
- 1주차 · 07.02 09:00 ~ 07.09 08:59
- 2주차 · 07.09 09:00 ~ 07.16 08:59 · 진행 중
- 3주차 · 07.16 09:00 ~ 07.23 08:59
- 4주차 · 07.23 09:00 ~ 08.02 23:59

모든 시간은 KST 기준이다.

### summary metric cards

상단에는 작은 metric card를 3~6개 배치한다.

Metric cards:

- 전체 커밋
- 이번 주 커밋
- 활성 repository
- 참여자 수
- 가장 활발한 팀
- 가장 활발한 분반

카드는 너무 크지 않게 만들고, 숫자가 잘 보이되 과한 glow는 쓰지 마라.

### 메인 콘텐츠 구조

Desktop:

- 왼쪽 65~70%: 메인 리더보드
- 오른쪽 30~35%: 최근 활동 feed + 동기화 상태
- 하단: contribution heatmap + 추이 그래프
- 관리자 기능은 별도 탭 또는 별도 페이지

Mobile:

- compact header
- metric cards 2열
- Top 3 compact card
- leaderboard list
- activity feed
- heatmap은 가로 스크롤

## 랭킹 정책

메인 랭킹은 다음 기준을 제공한다.

- 주차별 개인 랭킹
- 주차별 팀 랭킹
- 주차별 분반 랭킹
- 전체 기간 개인 랭킹
- 전체 기간 팀 랭킹
- 전체 기간 분반 랭킹

기본 화면에서는 “현재 주차” 기준을 먼저 보여준다.

분반 랭킹은 분반별 인원 수 차이가 있을 수 있으므로 기본 정렬은 “인당 평균”으로 한다. 단, 사용자가 “총합”으로 전환할 수 있는 토글을 제공한다.

분반 랭킹 토글:

- 인당 평균
- 총합

분반 랭킹 근처에는 다음 문구를 넣어라.

“분반 랭킹은 인원 차이를 보정하기 위해 기본적으로 인당 평균 기준으로 표시됩니다.”

## 일간 랭킹 정책

일간 랭킹은 메인 랭킹으로 크게 보여주지 않는다.

대신 다음 형태로만 보조적으로 제공한다.

- 오늘의 활동
- 최근 24시간 하이라이트
- 오늘 가장 활발한 팀
- 최근 24시간 순위 상승
- 최근 동기화 이후 새로 반영된 커밋 수

일간 랭킹은 과도한 경쟁이나 감시처럼 보일 수 있으므로, “랭킹”이라는 단어를 너무 강하게 쓰지 말고 “오늘의 활동” 또는 “최근 24시간 하이라이트”로 표현한다.

관리자 설정에서 일간 활동 위젯 공개 여부를 on/off 할 수 있게 한다.

설정 항목 예시:

- showDailyHighlights: true / false
- dailyWindowHours: 24
- dailyHighlightsLabel: “오늘의 활동”

## 리더보드 디자인

리더보드는 두 번째 레퍼런스처럼 정보 밀도가 있는 리스트/테이블 형태로 만들어라.

Top 1, 2, 3은 row 내부에서 medal badge로만 강조해라. 거대한 podium이 메인 화면을 차지하지 않게 해라.

### 개인 랭킹 row

각 row에는 다음 정보가 들어간다.

- 순위
- 이름
- GitHub username
- 분반
- 현재 팀 repo
- 커밋 수
- 활동일 수
- 최근 활동 시간
- 순위 변화

### 팀 랭킹 row

각 row에는 다음 정보가 들어간다.

- 순위
- repo 이름
- 분반
- 팀원 수
- 총 커밋 수
- 인당 평균
- 활동일 수
- 최근 활동 시간

### 분반 랭킹 row

각 row에는 다음 정보가 들어간다.

- 순위
- 분반
- 참가자 수
- 활성 repo 수
- 총 커밋 수
- 인당 평균
- 전주 대비 변화

## Top 3 compact highlight

Top 3 영역은 첫 번째 레퍼런스를 참고하되 compact하게 만들어라.

조건:

- 카드 3개 또는 작은 podium
- 전체 화면의 15~20% 이상을 차지하지 않을 것
- 캐릭터 아바타 대신 GitHub avatar 또는 initials avatar 사용
- prize, reward, point 같은 표현 금지
- commits, active days, repo 같은 개발 활동 지표 사용
- 메인 leaderboard보다 더 크고 화려하면 안 됨

## Contribution Heatmap

두 번째 레퍼런스처럼 GitHub contribution graph 느낌의 heatmap을 넣어라.

Heatmap 종류:

- 개인별 주간 활동 heatmap
- 팀별 날짜별 commit heatmap
- 분반별 weekly contribution heatmap

색상은 GitHub contribution graph에서 영감을 받되, 몰입캠프 다크 테마에 맞게 조정한다.

Heatmap 설명 문구:

“날짜별 GitHub 활동 흐름입니다. 모든 시간은 KST 기준으로 집계됩니다.”

## 최근 활동 Feed

오른쪽 사이드 또는 하단에 최근 활동 feed를 넣는다.

예시 문구:

- “김가온님이 w2-c1-03에서 새 커밋 3개를 추가했습니다.”
- “2분반의 이번 주 커밋 수가 500개를 넘었습니다.”
- “w2-c3-07 팀이 팀 랭킹 3위로 상승했습니다.”
- “마지막 동기화 이후 128개의 새 커밋이 반영되었습니다.”

주의:

- 실제 commit message를 크게 노출하지 마라.
- 민감하거나 부적절한 commit message가 있을 수 있으므로 요약형으로만 보여줘라.

## 서버리스 동기화 상태 UI

이 서비스는 최대한 서버리스 환경에서 운영된다.

가정:

- Frontend: Next.js 기반, Vercel 또는 Cloudflare Pages 배포
- GitHub 데이터 수집: GitHub Actions cron, Vercel Cron, Cloudflare Workers Scheduled Trigger 중 하나
- DB: Supabase, Turso, Neon, Cloudflare D1 같은 서버리스/관리형 DB
- 데이터는 완전 실시간이 아니라 주기적으로 동기화된다

따라서 화면에는 다음 정보를 보여줘야 한다.

- 마지막 동기화 시간
- 다음 동기화 예정 시간
- 동기화 상태: 정상 / 지연 / 실패
- GitHub API rate limit 상태
- 집계 대상 repository 수
- 최근 동기화에서 반영된 commit 수

예시 문구:

- “마지막 업데이트: 2026.07.12 18:30 KST”
- “GitHub 활동은 1시간마다 자동 반영됩니다.”
- “현재 데이터는 마지막 동기화 시점 기준입니다.”

## 관리자 설정 화면

관리자 전용 화면도 디자인한다. 참가자용 화면보다 실용적인 운영 대시보드 느낌이어야 한다.

관리자 설정 화면에는 다음 섹션이 필요하다.

### 캠프 설정

- 기수 이름
- season id
- 캠프 시작일
- 캠프 종료일
- 기본 시간대: Asia/Seoul
- 현재 활성 주차
- 분반 목록

### 주차 설정

주차는 날짜만이 아니라 KST 기준 시작/종료 시각까지 설정 가능해야 한다.

각 주차 항목:

- 주차 번호
- 표시 이름
- 시작 일시
- 종료 일시
- 시간대: KST / Asia/Seoul
- 상태: 예정 / 진행 중 / 종료
- 집계 포함 여부
- 수정 버튼

수정 UI 입력 필드:

- 주차 번호
- 표시 이름
- 시작 날짜
- 시작 시간
- 종료 날짜
- 종료 시간
- 시간대
- 집계 포함 여부

### GitHub 설정

- GitHub organization 이름
- repository prefix
- repository naming pattern
- 집계 대상 repository 목록
- 제외 repository 목록
- 제외 참가자 목록

### 랭킹 설정

- 분반 랭킹 기본 기준: 인당 평균 / 총합
- 개인 랭킹 공개 여부
- 팀 랭킹 공개 여부
- 분반 랭킹 공개 여부
- 오늘의 활동 위젯 공개 여부
- badge 기능 사용 여부

### 동기화 설정

- 업데이트 주기
- 수동 동기화 버튼
- 마지막 동기화 시간
- 동기화 로그
- 실패 repository 목록
- GitHub API rate limit 상태

## 설정 파일 예시

관리자 설정은 코드에 하드코딩하지 않고 config 또는 DB 기반으로 관리될 수 있어야 한다.

예시 설정:

```json
{
  "season": "2026-summer",
  "displayName": "2026 여름학기",
  "timezone": "Asia/Seoul",
  "githubOrg": "madcamp-official",
  "currentWeek": 2,
  "weeks": [
    {
      "week": 1,
      "label": "1주차",
      "startAt": "2026-07-02T09:00:00+09:00",
      "endAt": "2026-07-09T08:59:59+09:00",
      "status": "ended",
      "enabled": true
    },
    {
      "week": 2,
      "label": "2주차",
      "startAt": "2026-07-09T09:00:00+09:00",
      "endAt": "2026-07-16T08:59:59+09:00",
      "status": "active",
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

## 문구 정책

이 서비스는 평가/감시 도구처럼 보이면 안 된다.

피해야 할 단어:

- 감시
- 평가
- 벌점
- 저조
- 부진
- 꼴찌
- 미활동자 압박
- 기여 부족

권장 단어:

- 활동
- 몰입
- 흐름
- 기여
- 기록
- 개발 에너지
- 이번 주 움직임
- 팀의 발자국
- GitHub 활동

반드시 넣을 문구:

“커밋 수는 GitHub 활동량을 보여주는 참고 지표입니다. 작은 커밋, 문서 정리, 기획, 디자인, 디버깅도 모두 중요한 기여입니다.”

시간 기준 문구:

“모든 랭킹은 KST 기준 주차 설정에 따라 집계됩니다.”

## 색상과 스타일

색상은 절제해라.

- background: #050816 또는 더 차분한 near-black navy
- surface: #0B1020
- elevated surface: #111827
- border: 낮은 대비의 slate border
- primary cyan은 active tab, 주요 버튼에만 제한적으로 사용
- lime은 진행 중 상태와 상승 표시만 사용
- gold는 1위 medal에만 사용
- purple은 보조 accent로만 사용
- glow는 거의 쓰지 말고, 필요하면 아주 약하게만 사용

피해야 할 것:

- 큰 네온 박스
- 과한 gradient
- 과한 glow
- 큰 Hero section
- 코인/보상 앱 같은 prize UI
- NFT/game reward 느낌
- 의미 없는 장식 아이콘
- 너무 큰 Top 3 podium
- “가짜 SaaS 대시보드” 느낌
- “해커톤 홍보 페이지” 같은 느낌

## UI 컴포넌트 / 패키지 제약

Next.js + TypeScript + Tailwind CSS + shadcn/ui 기반으로 구현 가능한 디자인으로 만들어라.

shadcn/ui는 디자인 시스템의 기반으로 사용한다. 새로운 UI 라이브러리를 임의로 추가하지 마라.

사용 가능한 shadcn/ui 컴포넌트:

- Button
- Card
- Badge
- Tabs
- Table
- Select
- DropdownMenu
- Tooltip
- Avatar
- Progress
- Skeleton
- Alert
- Sheet
- Dialog
- Separator
- Input
- Label
- Switch
- Checkbox
- Popover

아이콘은 lucide-react 스타일만 사용한다.

차트는 Recharts로 구현 가능한 수준으로 디자인한다.

날짜와 시간 표시는 KST 기준이다.

## 공통 컴포넌트 규칙

새로운 UI 패턴을 매번 임의로 만들지 말고, 아래 공통 컴포넌트를 반복 사용해서 전체 제품의 일관성을 유지해라.

공통 컴포넌트:

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

각 컴포넌트는 shadcn/ui 컴포넌트를 조합해서 만든다.

예를 들어:

- MetricCard는 Card + Badge + Tooltip 기반
- LeaderboardRow는 Table row 또는 Card row 기반
- WeekSelector는 Tabs 또는 Select 기반
- SyncStatusBadge는 Badge + Tooltip 기반
- AdminSettingCard는 Card + Input + Switch 기반
- ActivityFeedItem은 Card 또는 list item 기반

임의로 새로운 버튼 스타일, 카드 스타일, 테이블 스타일을 만들지 말고, 디자인 토큰과 공통 컴포넌트를 확장해서 사용한다.

## Design Tokens

다음 디자인 토큰을 기준으로 사용한다.

- Background: #050816
- Surface: #0B1020
- Surface elevated: #111827
- Border: #1F2937 또는 rgba(255,255,255,0.08)
- Primary: #22D3EE
- Secondary: #8B5CF6
- Success: #84CC16
- Warning: #FACC15
- Danger: soft red
- Gold: #FACC15
- Text primary: #F8FAFC
- Text secondary: #94A3B8
- Radius card: 16px
- Radius button: 10px
- Font: 한국어 가독성이 좋은 sans-serif
- Card style: dark surface + subtle border
- Glow: 기본적으로 사용하지 않음. 필요한 경우 top 1 badge 정도에만 아주 약하게 사용

## 필요한 화면

다음 화면들을 디자인해줘.

1. 메인 대시보드
2. 개인 랭킹 화면
3. 팀 랭킹 화면
4. 분반 랭킹 화면
5. 특정 팀 상세 화면
6. 특정 참가자 상세 화면
7. 관리자 설정 화면
8. 관리자 동기화 상태 화면
9. 모바일 화면

## 최종 목표

전체적으로 두 번째 레퍼런스의 정보 밀도와 차분함을 중심으로 하고, 첫 번째 레퍼런스의 게임성은 아주 제한적으로 섞어라.

최종 결과물은 “AI가 만든 화려한 가짜 대시보드”가 아니라 “몰입캠프 참가자와 운영진이 실제로 매일 확인하고 싶은 GitHub activity leaderboard”여야 한다.
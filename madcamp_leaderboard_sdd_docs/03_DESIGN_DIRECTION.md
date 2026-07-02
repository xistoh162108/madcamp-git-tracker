# Design Direction — Production-grade Duolingo-dark GitHub Leaderboard

## 1. 현재 디자인 문제

사용자가 제공한 v0/Figma Make 결과물은 방향은 비슷하지만 다음 문제가 있다.

- AI-generated cyber dashboard처럼 보임
- 네온 cyan과 glow가 과함
- 큰 hero 영역이 실제 제품보다 홍보 페이지처럼 보임
- podium이 장식적으로 크면 보상 앱처럼 보임
- 카드가 많지만 정보 밀도가 낮음
- 실제 GitHub analytics처럼 신뢰감이 부족함
- “코인/포인트/NFT reward dashboard” 느낌이 날 수 있음

따라서 기존 디자인 ZIP은 참고만 하고, 최종 UI는 다시 정제한다.

## 2. 최종 미감

목표:

```txt
Duolingo dark leaderboard
+ GitHub contribution graph
+ Linear/Vercel product dashboard
+ Grafana/Datadog operational clarity
```

### Do

- compact, information-dense
- dark but calm
- subtle border
- high-quality typography hierarchy
- rank movement animation
- tactile hover interaction
- bright accent used sparingly
- contribution heatmap as identity
- leaderboard rows as main product
- Top 3 compact highlight

### Do not

- huge hero
- giant glowing cards
- overuse cyan
- NFT reward UI
- coin dashboard
- cyberpunk fake dashboard
- meaningless icons
- excessive gradient
- meaningless podium occupying fold

## 3. Layout

### Desktop

```txt
┌─────────────────────────────────────────────────────────┐
│ TopNav: 몰입 랭킹 | 개인 | 팀 | 분반 | 관리자 | 동기화 │
├─────────────────────────────────────────────────────────┤
│ WeekSelector + SyncStatus + KST 기준 안내                │
├─────────────────────────────────────────────────────────┤
│ Metric Cards: commits / repos / participants / active   │
├─────────────────────────────────────┬───────────────────┤
│ Main Leaderboard                    │ Activity Feed     │
│ Compact Top 3                       │ Sync Mini Panel   │
│ Tabs: 개인/팀/분반                  │ Today Highlights  │
│ Table/List Rows                     │                   │
├─────────────────────────────────────┴───────────────────┤
│ Contribution Heatmap + Trend Chart                       │
└─────────────────────────────────────────────────────────┘
```

### Mobile

```txt
TopNav
WeekSelector
Metric cards 2 columns
Compact Top 3
Leaderboard card list
Today highlights
Activity feed
Heatmap horizontal scroll
```

## 4. Visual System

### Colors

```txt
background: #050816
surface: #0B1020
elevated: #111827
border: rgba(255,255,255,0.08)
primary: #22D3EE
secondary: #8B5CF6
success: #84CC16
gold: #FACC15
text-primary: #F8FAFC
text-secondary: #94A3B8
```

### Usage

- primary cyan: active tab, CTA button, selected week only
- lime: 진행 중, 상승 표시 only
- gold: 1위 medal only
- purple: minor accent only
- glow: almost none; top 1 medal only if necessary

## 5. Component rules

Use shadcn/ui as foundation.

Allowed components:

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

Icons: lucide-react only.

Charts: Recharts only.

## 6. Key components

### MetricCard

- compact
- large number
- small label
- optional delta
- no meaningless icon unless helpful
- no big glow

### LeaderboardRow

- row/card hybrid
- rank badge
- avatar
- primary identity
- secondary metadata
- metric values aligned right
- rank change pill
- hover highlight

### CompactTopThree

- 3 compact cards or top rows
- GitHub avatar/initials
- commits and active days
- no prize, point, reward language
- max 15~20% of screen vertical space

### ContributionHeatmap

- GitHub-like grid
- tooltip on hover
- KST date label
- intensity levels
- horizontal scroll on mobile

### ActivityFeed

- summary-only
- no raw commit message large display
- slide-in animation for new items

### AdminSyncPanel

- rate limit
- last sync
- failed repos
- unknown users
- compact and operational

## 7. Animation

Required:

- Count-up metrics
- Row entrance stagger
- Rank change pulse
- Heatmap hover tooltip
- Activity feed new item slide-in
- Sync status pulse
- Tab transition
- Mobile sheet transition

Use `prefers-reduced-motion`.

Avoid:

- constant blinking
- heavy particles
- cyber glow pulse
- 3D spinning graphics

## 8. Copywriting

한국어 UI.

Good words:

- 활동
- 몰입
- 흐름
- 기여
- 기록
- 개발 에너지
- GitHub 활동

Avoid:

- 감시
- 평가
- 벌점
- 부진
- 꼴찌
- 기여 부족

Required copy:

```txt
커밋 수는 GitHub 활동량을 보여주는 참고 지표입니다. 작은 커밋, 문서 정리, 기획, 디자인, 디버깅도 모두 중요한 기여입니다.
```

```txt
분반 랭킹은 인원 차이를 보정하기 위해 기본적으로 인당 평균 기준으로 표시됩니다.
```

```txt
모든 랭킹은 KST 기준 주차 설정에 따라 집계됩니다.
```

## 9. Design references to emulate

- GitHub contribution graph / repository insights
- Duolingo leaderboard dark version 느낌
- Linear dashboard spacing and calmness
- Vercel dashboard minimalism
- Grafana/Datadog operational clarity
- Mobbin leaderboard/dashboard information patterns
- shadcn/ui dashboard blocks

## 10. Acceptance criteria

- 첫 화면에서 leaderboard가 주인공이다.
- Hero가 홍보 페이지처럼 크지 않다.
- Top 3가 compact하다.
- 정보 밀도가 충분하다.
- 네온/glow가 절제되어 있다.
- 개발자용 activity dashboard처럼 신뢰감이 있다.
- 모바일에서도 ranking 중심으로 읽힌다.
- 사용자에게 “AI가 만든 싼티 나는 dashboard” 느낌이 들지 않는다.

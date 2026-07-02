// ─────────────────────────────────────────────────────────────────────────────
// 몰입 랭킹 — 관리자 설정 + 로컬 fallback 데이터
// 모든 시간 기준은 KST(Asia/Seoul) 입니다.
// 실제 운영 화면은 snapshot JSON을 우선 사용합니다.
// ─────────────────────────────────────────────────────────────────────────────

export type WeekStatus = "upcoming" | "active" | "ended"

export interface WeekConfig {
  week: number
  label: string
  startAt: string // ISO with +09:00
  endAt: string
  status: WeekStatus
  enabled: boolean
}

export interface CampConfig {
  season: string
  displayName: string
  timezone: string
  githubOrg: string
  currentWeek: number
  startDate: string
  endDate: string
  classes: string[]
  repoNamePattern: string
  repoPrefix: string
  defaultClassRankingMetric: "averagePerPerson" | "total"
  syncInterval: string
  showDailyHighlights: boolean
  dailyWindowHours: number
  dailyHighlightsLabel: string
  rankingVisibility: {
    individual: boolean
    team: boolean
    class: boolean
  }
  showLastSync: boolean
}

export const config: CampConfig = {
  season: "2026-summer",
  displayName: "2026 여름학기",
  timezone: "Asia/Seoul",
  githubOrg: "madcamp-official",
  currentWeek: 2,
  startDate: "2026-07-02",
  endDate: "2026-08-02",
  classes: ["1분반", "2분반", "3분반", "4분반"],
  repoNamePattern: "{yy}{semCode}-w{week}-c{class}-{teamNumber}",
  repoPrefix: "26s",
  defaultClassRankingMetric: "averagePerPerson",
  syncInterval: "10분마다",
  showDailyHighlights: true,
  dailyWindowHours: 24,
  dailyHighlightsLabel: "오늘의 활동",
  rankingVisibility: { individual: true, team: true, class: true },
  showLastSync: true,
}

export const weeks: WeekConfig[] = [
  {
    week: 1,
    label: "1주차",
    startAt: "2026-07-02T09:00:00+09:00",
    endAt: "2026-07-09T08:59:59+09:00",
    status: "ended",
    enabled: true,
  },
  {
    week: 2,
    label: "2주차",
    startAt: "2026-07-09T09:00:00+09:00",
    endAt: "2026-07-16T08:59:59+09:00",
    status: "active",
    enabled: true,
  },
  {
    week: 3,
    label: "3주차",
    startAt: "2026-07-16T09:00:00+09:00",
    endAt: "2026-07-23T08:59:59+09:00",
    status: "upcoming",
    enabled: true,
  },
  {
    week: 4,
    label: "4주차",
    startAt: "2026-07-23T09:00:00+09:00",
    endAt: "2026-08-02T23:59:59+09:00",
    status: "upcoming",
    enabled: true,
  },
]

// ── Sync status ──────────────────────────────────────────────────────────────
export interface SyncStatus {
  state: "ok" | "delayed" | "failed"
  lastSync: string // display string (KST)
  nextSync: string
  rateLimitUsed: number
  rateLimitTotal: number
  reposTracked: number
  commitsSinceLastSync: number
  failedRepos: string[]
}

export const syncStatus: SyncStatus = {
  state: "ok",
  lastSync: "2026.07.12 18:30 KST",
  nextSync: "2026.07.12 18:40 KST",
  rateLimitUsed: 1840,
  rateLimitTotal: 5000,
  reposTracked: 48,
  commitsSinceLastSync: 128,
  failedRepos: [],
}

// ── Summary metrics ──────────────────────────────────────────────────────────
export const summary = {
  totalCommits: 8421,
  weekCommits: 1934,
  activeRepos: 48,
  participants: 96,
  topTeam: "w2-c3-07",
  topClass: "3분반",
  weekEndCountdownMs: 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000, // 3일 4시간
}

// ── Individual ranking ─────────────────────────────────────────────────────────
export interface Individual {
  rank: number
  prevRank: number
  name: string
  username: string
  class: string
  team: string
  commits: number
  activeDays: number
  lastActivity: string
}

export const individuals: Individual[] = [
  {
    rank: 1,
    prevRank: 3,
    name: "김가온",
    username: "gaon-kim",
    class: "3분반",
    team: "w2-c3-07",
    commits: 94,
    activeDays: 7,
    lastActivity: "12분 전",
  },
  {
    rank: 2,
    prevRank: 1,
    name: "이서준",
    username: "seojun-lee",
    class: "1분반",
    team: "w2-c1-03",
    commits: 88,
    activeDays: 7,
    lastActivity: "34분 전",
  },
  {
    rank: 3,
    prevRank: 5,
    name: "박하린",
    username: "harin-park",
    class: "2분반",
    team: "w2-c2-05",
    commits: 81,
    activeDays: 6,
    lastActivity: "1시간 전",
  },
  {
    rank: 4,
    prevRank: 2,
    name: "정도윤",
    username: "doyun-jung",
    class: "3분반",
    team: "w2-c3-02",
    commits: 76,
    activeDays: 6,
    lastActivity: "2시간 전",
  },
  {
    rank: 5,
    prevRank: 7,
    name: "최예나",
    username: "yena-choi",
    class: "4분반",
    team: "w2-c4-01",
    commits: 72,
    activeDays: 7,
    lastActivity: "26분 전",
  },
  {
    rank: 6,
    prevRank: 6,
    name: "한지우",
    username: "jiwoo-han",
    class: "1분반",
    team: "w2-c1-08",
    commits: 68,
    activeDays: 5,
    lastActivity: "3시간 전",
  },
  {
    rank: 7,
    prevRank: 4,
    name: "오시현",
    username: "sihyun-oh",
    class: "2분반",
    team: "w2-c2-04",
    commits: 64,
    activeDays: 6,
    lastActivity: "1시간 전",
  },
  {
    rank: 8,
    prevRank: 9,
    name: "윤채원",
    username: "chaewon-yoon",
    class: "3분반",
    team: "w2-c3-07",
    commits: 61,
    activeDays: 5,
    lastActivity: "44분 전",
  },
  {
    rank: 9,
    prevRank: 8,
    name: "장민재",
    username: "minjae-jang",
    class: "4분반",
    team: "w2-c4-06",
    commits: 57,
    activeDays: 5,
    lastActivity: "4시간 전",
  },
  {
    rank: 10,
    prevRank: 12,
    name: "강수아",
    username: "sua-kang",
    class: "1분반",
    team: "w2-c1-03",
    commits: 54,
    activeDays: 6,
    lastActivity: "2시간 전",
  },
  {
    rank: 11,
    prevRank: 10,
    name: "신우진",
    username: "woojin-shin",
    class: "2분반",
    team: "w2-c2-05",
    commits: 51,
    activeDays: 4,
    lastActivity: "5시간 전",
  },
  {
    rank: 12,
    prevRank: 11,
    name: "임도아",
    username: "doa-lim",
    class: "3분반",
    team: "w2-c3-02",
    commits: 49,
    activeDays: 5,
    lastActivity: "3시간 전",
  },
  {
    rank: 13,
    prevRank: 13,
    name: "조하준",
    username: "hajun-cho",
    class: "4분반",
    team: "w2-c4-01",
    commits: 46,
    activeDays: 4,
    lastActivity: "6시간 전",
  },
  {
    rank: 14,
    prevRank: 16,
    name: "배서윤",
    username: "seoyun-bae",
    class: "1분반",
    team: "w2-c1-08",
    commits: 43,
    activeDays: 5,
    lastActivity: "1시간 전",
  },
  {
    rank: 15,
    prevRank: 14,
    name: "권지호",
    username: "jiho-kwon",
    class: "2분반",
    team: "w2-c2-04",
    commits: 41,
    activeDays: 4,
    lastActivity: "7시간 전",
  },
]

// ── Team ranking ──────────────────────────────────────────────────────────────
export interface Team {
  rank: number
  prevRank: number
  repo: string
  class: string
  members: string[]
  commits: number
  lastActivity: string
  activeDays: number
}

export const teams: Team[] = [
  {
    rank: 1,
    prevRank: 2,
    repo: "2026-summer-w2-c3-07",
    class: "3분반",
    members: ["김가온", "윤채원", "서지안", "한도경"],
    commits: 248,
    activeDays: 7,
    lastActivity: "12분 전",
  },
  {
    rank: 2,
    prevRank: 1,
    repo: "2026-summer-w2-c1-03",
    class: "1분반",
    members: ["이서준", "강수아", "노하율"],
    commits: 231,
    activeDays: 7,
    lastActivity: "34분 전",
  },
  {
    rank: 3,
    prevRank: 5,
    repo: "2026-summer-w2-c2-05",
    class: "2분반",
    members: ["박하린", "신우진", "문서진", "유아인"],
    commits: 219,
    activeDays: 6,
    lastActivity: "1시간 전",
  },
  {
    rank: 4,
    prevRank: 3,
    repo: "2026-summer-w2-c3-02",
    class: "3분반",
    members: ["정도윤", "임도아", "황시우"],
    commits: 204,
    activeDays: 6,
    lastActivity: "2시간 전",
  },
  {
    rank: 5,
    prevRank: 7,
    repo: "2026-summer-w2-c4-01",
    class: "4분반",
    members: ["최예나", "조하준", "백지안"],
    commits: 192,
    activeDays: 7,
    lastActivity: "26분 전",
  },
  {
    rank: 6,
    prevRank: 4,
    repo: "2026-summer-w2-c1-08",
    class: "1분반",
    members: ["한지우", "배서윤", "고은우"],
    commits: 178,
    activeDays: 5,
    lastActivity: "3시간 전",
  },
  {
    rank: 7,
    prevRank: 6,
    repo: "2026-summer-w2-c2-04",
    class: "2분반",
    members: ["오시현", "권지호", "남세빈"],
    commits: 165,
    activeDays: 6,
    lastActivity: "1시간 전",
  },
  {
    rank: 8,
    prevRank: 8,
    repo: "2026-summer-w2-c4-06",
    class: "4분반",
    members: ["장민재", "윤하늘", "전우혁"],
    commits: 151,
    activeDays: 5,
    lastActivity: "4시간 전",
  },
  {
    rank: 9,
    prevRank: 10,
    repo: "2026-summer-w2-c3-04",
    class: "3분반",
    members: ["송재윤", "구한별"],
    commits: 138,
    activeDays: 4,
    lastActivity: "5시간 전",
  },
  {
    rank: 10,
    prevRank: 9,
    repo: "2026-summer-w2-c1-06",
    class: "1분반",
    members: ["허도현", "양채은", "심지아"],
    commits: 124,
    activeDays: 4,
    lastActivity: "6시간 전",
  },
]

// ── Class ranking ─────────────────────────────────────────────────────────────
export interface ClassRank {
  rank: number
  prevRank: number
  className: string
  participants: number
  activeRepos: number
  totalCommits: number
}

export const classes: ClassRank[] = [
  { rank: 1, prevRank: 2, className: "3분반", participants: 23, activeRepos: 8, totalCommits: 2384 },
  { rank: 2, prevRank: 1, className: "1분반", participants: 25, activeRepos: 9, totalCommits: 2451 },
  { rank: 3, prevRank: 3, className: "2분반", participants: 24, activeRepos: 8, totalCommits: 2098 },
  { rank: 4, prevRank: 4, className: "4분반", participants: 24, activeRepos: 8, totalCommits: 1812 },
]

// ── Activity feed (요약형) ──────────────────────────────────────────────────────
export interface FeedItem {
  id: number
  text: string
  time: string
  kind: "commit" | "milestone" | "rankup"
}

export const feed: FeedItem[] = [
  { id: 1, text: "김가온님이 w2-c3-07에서 새 커밋 3개를 추가했습니다.", time: "12분 전", kind: "commit" },
  { id: 2, text: "2분반의 이번 주 커밋 수가 500개를 넘었습니다.", time: "38분 전", kind: "milestone" },
  { id: 3, text: "w2-c3-07 팀이 팀 랭킹 1위로 상승했습니다.", time: "52분 전", kind: "rankup" },
  { id: 4, text: "w2-c2-04 팀이 오늘 128개의 커밋을 추가했습니다.", time: "1시간 전", kind: "milestone" },
  { id: 5, text: "최예나님이 w2-c4-01에서 README를 정리했습니다.", time: "1시간 전", kind: "commit" },
  { id: 6, text: "박하린님이 '리팩토링 장인' 배지를 획득했습니다.", time: "2시간 전", kind: "milestone" },
  { id: 7, text: "w2-c1-03 팀이 활동일 7일을 달성했습니다.", time: "3시간 전", kind: "milestone" },
  { id: 8, text: "1분반의 활성 repository가 9개로 늘었습니다.", time: "4시간 전", kind: "commit" },
]

// ── Daily highlights (오늘의 활동) ───────────────────────────────────────────────
export const dailyHighlights = {
  todayCommits: 312,
  topTeamToday: "w2-c3-07",
  topMoverToday: "박하린",
  newCommitsSinceSync: 128,
}

// ── Trend charts ────────────────────────────────────────────────────────────────
export const weeklyTrend = [
  { week: "1주차", commits: 1842 },
  { week: "2주차", commits: 1934 },
  { week: "3주차", commits: 0 },
  { week: "4주차", commits: 0 },
]

export const dailyTrend = [
  { date: "07.09", commits: 268 },
  { date: "07.10", commits: 312 },
  { date: "07.11", commits: 289 },
  { date: "07.12", commits: 341 },
  { date: "07.13", commits: 198 },
  { date: "07.14", commits: 276 },
  { date: "07.15", commits: 250 },
]

export const classCompare = [
  { name: "1분반", commits: 2451 },
  { name: "2분반", commits: 2098 },
  { name: "3분반", commits: 2384 },
  { name: "4분반", commits: 1812 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
export const weekLabels = ["월", "화", "수", "목", "금", "토", "일"]

export function rankDelta(rank: number, prevRank: number) {
  return prevRank - rank // +면 상승
}

export function fmtRepoShort(repo: string) {
  // 2026-summer-w2-c3-07 -> w2-c3-07
  return repo.replace(/^.*?(w\d+-c\d+-\d+)$/, "$1")
}

export const repoNoticeText =
  "커밋 수는 GitHub 활동량을 보여주는 참고 지표이며, 프로젝트 기여도 전체를 의미하지는 않습니다."
export const contributionNoticeText =
  "커밋 수는 GitHub 활동량을 보여주는 참고 지표입니다. 전체 커밋과 개인 랭킹 합계는 집계 방식에 따라 다를 수 있습니다."
export const classNoticeText =
  "분반 랭킹은 기본적으로 등록 참가자 수 기준 인당 평균으로 표시됩니다. 총합 기준으로도 전환할 수 있습니다."
export const lineNoticeText = "변경 line 수는 자동 생성 파일과 대용량 파일을 제외한 참고 지표입니다."
export const kstNoticeText = "주차와 날짜는 한국 시간으로 표시됩니다."

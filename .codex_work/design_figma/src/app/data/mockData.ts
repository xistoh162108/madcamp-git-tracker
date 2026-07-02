export const config = {
  season: "2026-summer",
  displayName: "2026 여름학기",
  timezone: "Asia/Seoul",
  githubOrg: "madcamp-official",
  currentWeek: 2,
  weeks: [
    {
      week: 1,
      label: "1주차",
      startAt: "2026-07-02T09:00:00+09:00",
      endAt: "2026-07-09T08:59:59+09:00",
      status: "ended" as const,
      enabled: true,
    },
    {
      week: 2,
      label: "2주차",
      startAt: "2026-07-09T09:00:00+09:00",
      endAt: "2026-07-16T08:59:59+09:00",
      status: "active" as const,
      enabled: true,
    },
    {
      week: 3,
      label: "3주차",
      startAt: "2026-07-16T09:00:00+09:00",
      endAt: "2026-07-23T08:59:59+09:00",
      status: "upcoming" as const,
      enabled: true,
    },
    {
      week: 4,
      label: "4주차",
      startAt: "2026-07-23T09:00:00+09:00",
      endAt: "2026-08-02T23:59:59+09:00",
      status: "upcoming" as const,
      enabled: true,
    },
  ],
  classes: ["1분반", "2분반", "3분반", "4분반"],
  repoNamePattern: "{season}-w{week}-c{class}-{teamNumber}",
  defaultClassRankingMetric: "averagePerPerson" as "averagePerPerson" | "total",
  syncInterval: "1시간마다",
  lastSyncAt: "2026-07-12T18:30:00+09:00",
  nextSyncAt: "2026-07-12T19:30:00+09:00",
  syncStatus: "normal" as "normal" | "delayed" | "failed",
  totalRepos: 18,
  lastSyncCommits: 128,
  githubRateLimit: { remaining: 4823, total: 5000 },
  rankingPublic: { individual: true, team: true, class: true },
  badgesEnabled: true,
  excludedRepos: [] as string[],
  excludedParticipants: [] as string[],
  adminAccounts: ["admin-kaist", "prof-madcamp"],
  showLastSyncTime: true,
  repoPrefix: "2026-summer",
};

export type WeekStatus = "ended" | "active" | "upcoming";
export type SyncStatus = "normal" | "delayed" | "failed";

export interface WeekData {
  week: number;
  commits: number;
  teamRepo: string;
  rankChange: number;
}

export interface Participant {
  id: string;
  name: string;
  githubUsername: string;
  class: string;
  weeklyData: WeekData[];
  totalCommits: number;
  rank: number;
  prevRank: number;
  badges: string[];
  lastActivity: string;
}

export interface TeamStats {
  repo: string;
  week: number;
  class: string;
  teamNumber: number;
  memberIds: string[];
  totalCommits: number;
  avgCommitsPerPerson: number;
  lastActivity: string;
  rank: number;
  prevRank: number;
  rankChange: number;
  commitHistory: { date: string; commits: number }[];
}

export interface ClassStats {
  class: string;
  totalCommits: number;
  avgCommitsPerPerson: number;
  memberCount: number;
  activeRepos: number;
  prevWeekCommits: number;
  rank: number;
  prevRank: number;
  rankChange: number;
}

export interface ActivityItem {
  id: string;
  type: "commit" | "milestone" | "rank-up" | "sync";
  message: string;
  time: string;
  class?: string;
}

export const participants: Participant[] = [
  {
    id: "p1",
    name: "김가온",
    githubUsername: "kaon-kim",
    class: "1분반",
    weeklyData: [
      { week: 1, commits: 62, teamRepo: "2026-summer-w1-c1-01", rankChange: 0 },
      { week: 2, commits: 74, teamRepo: "2026-summer-w2-c1-02", rankChange: 2 },
    ],
    totalCommits: 136,
    rank: 1,
    prevRank: 3,
    badges: ["첫 커밋", "이번 주 10 commits", "꾸준한 기여자", "밤샘 개발자"],
    lastActivity: "2026-07-12T17:45:00+09:00",
  },
  {
    id: "p2",
    name: "강도현",
    githubUsername: "dohyun-kang",
    class: "2분반",
    weeklyData: [
      { week: 1, commits: 58, teamRepo: "2026-summer-w1-c2-01", rankChange: 0 },
      { week: 2, commits: 67, teamRepo: "2026-summer-w2-c2-01", rankChange: 0 },
    ],
    totalCommits: 125,
    rank: 2,
    prevRank: 2,
    badges: ["첫 커밋", "이번 주 10 commits", "첫 배포 성공", "꾸준한 기여자"],
    lastActivity: "2026-07-12T19:00:00+09:00",
  },
  {
    id: "p3",
    name: "이서준",
    githubUsername: "seojun-lee",
    class: "1분반",
    weeklyData: [
      { week: 1, commits: 55, teamRepo: "2026-summer-w1-c1-01", rankChange: 0 },
      { week: 2, commits: 61, teamRepo: "2026-summer-w2-c1-02", rankChange: -1 },
    ],
    totalCommits: 116,
    rank: 3,
    prevRank: 1,
    badges: ["첫 커밋", "꾸준한 기여자", "README 정리 완료"],
    lastActivity: "2026-07-12T16:20:00+09:00",
  },
  {
    id: "p4",
    name: "윤지호",
    githubUsername: "jiho-yun",
    class: "2분반",
    weeklyData: [
      { week: 1, commits: 51, teamRepo: "2026-summer-w1-c2-01", rankChange: 0 },
      { week: 2, commits: 57, teamRepo: "2026-summer-w2-c2-02", rankChange: 1 },
    ],
    totalCommits: 108,
    rank: 4,
    prevRank: 5,
    badges: ["첫 커밋", "연속 활동", "리팩토링 장인"],
    lastActivity: "2026-07-12T15:40:00+09:00",
  },
  {
    id: "p5",
    name: "오태양",
    githubUsername: "taeyang-oh",
    class: "3분반",
    weeklyData: [
      { week: 1, commits: 49, teamRepo: "2026-summer-w1-c3-01", rankChange: 0 },
      { week: 2, commits: 54, teamRepo: "2026-summer-w2-c3-01", rankChange: 2 },
    ],
    totalCommits: 103,
    rank: 5,
    prevRank: 7,
    badges: ["첫 커밋", "마감 전력질주", "꾸준한 기여자"],
    lastActivity: "2026-07-12T18:55:00+09:00",
  },
  {
    id: "p6",
    name: "박하윤",
    githubUsername: "hayun-park",
    class: "1분반",
    weeklyData: [
      { week: 1, commits: 48, teamRepo: "2026-summer-w1-c1-02", rankChange: 0 },
      { week: 2, commits: 53, teamRepo: "2026-summer-w2-c1-03", rankChange: 1 },
    ],
    totalCommits: 101,
    rank: 6,
    prevRank: 7,
    badges: ["첫 커밋", "이번 주 10 commits", "리팩토링 장인"],
    lastActivity: "2026-07-12T14:10:00+09:00",
  },
  {
    id: "p7",
    name: "남도윤",
    githubUsername: "doyun-nam",
    class: "4분반",
    weeklyData: [
      { week: 1, commits: 46, teamRepo: "2026-summer-w1-c4-01", rankChange: 0 },
      { week: 2, commits: 50, teamRepo: "2026-summer-w2-c4-01", rankChange: 3 },
    ],
    totalCommits: 96,
    rank: 7,
    prevRank: 10,
    badges: ["첫 커밋", "연속 활동"],
    lastActivity: "2026-07-12T17:20:00+09:00",
  },
  {
    id: "p8",
    name: "정수아",
    githubUsername: "sua-jung",
    class: "1분반",
    weeklyData: [
      { week: 1, commits: 37, teamRepo: "2026-summer-w1-c1-03", rankChange: 0 },
      { week: 2, commits: 45, teamRepo: "2026-summer-w2-c1-01", rankChange: 3 },
    ],
    totalCommits: 82,
    rank: 8,
    prevRank: 11,
    badges: ["첫 커밋", "문서 정리왕", "연속 활동"],
    lastActivity: "2026-07-12T18:00:00+09:00",
  },
  {
    id: "p9",
    name: "임채원",
    githubUsername: "chaewon-lim",
    class: "2분반",
    weeklyData: [
      { week: 1, commits: 40, teamRepo: "2026-summer-w1-c2-02", rankChange: 0 },
      { week: 2, commits: 41, teamRepo: "2026-summer-w2-c2-01", rankChange: -1 },
    ],
    totalCommits: 81,
    rank: 9,
    prevRank: 8,
    badges: ["첫 커밋", "README 정리 완료"],
    lastActivity: "2026-07-11T22:30:00+09:00",
  },
  {
    id: "p10",
    name: "최민준",
    githubUsername: "minjun-choi",
    class: "1분반",
    weeklyData: [
      { week: 1, commits: 41, teamRepo: "2026-summer-w1-c1-02", rankChange: 0 },
      { week: 2, commits: 38, teamRepo: "2026-summer-w2-c1-03", rankChange: -2 },
    ],
    totalCommits: 79,
    rank: 10,
    prevRank: 8,
    badges: ["첫 커밋", "마감 전력질주"],
    lastActivity: "2026-07-12T11:30:00+09:00",
  },
  {
    id: "p11",
    name: "배나연",
    githubUsername: "nayeon-bae",
    class: "3분반",
    weeklyData: [
      { week: 1, commits: 38, teamRepo: "2026-summer-w1-c3-01", rankChange: 0 },
      { week: 2, commits: 36, teamRepo: "2026-summer-w2-c3-02", rankChange: -1 },
    ],
    totalCommits: 74,
    rank: 11,
    prevRank: 10,
    badges: ["첫 커밋", "문서 정리왕"],
    lastActivity: "2026-07-12T13:15:00+09:00",
  },
  {
    id: "p12",
    name: "한소율",
    githubUsername: "soyul-han",
    class: "2분반",
    weeklyData: [
      { week: 1, commits: 33, teamRepo: "2026-summer-w1-c2-02", rankChange: 0 },
      { week: 2, commits: 39, teamRepo: "2026-summer-w2-c2-02", rankChange: 2 },
    ],
    totalCommits: 72,
    rank: 12,
    prevRank: 14,
    badges: ["첫 커밋", "연속 활동"],
    lastActivity: "2026-07-12T16:50:00+09:00",
  },
  {
    id: "p13",
    name: "신현우",
    githubUsername: "hyunwoo-shin",
    class: "3분반",
    weeklyData: [
      { week: 1, commits: 35, teamRepo: "2026-summer-w1-c3-02", rankChange: 0 },
      { week: 2, commits: 34, teamRepo: "2026-summer-w2-c3-01", rankChange: 0 },
    ],
    totalCommits: 69,
    rank: 13,
    prevRank: 13,
    badges: ["첫 커밋", "리팩토링 장인"],
    lastActivity: "2026-07-12T10:00:00+09:00",
  },
  {
    id: "p14",
    name: "전서현",
    githubUsername: "seohyun-jeon",
    class: "4분반",
    weeklyData: [
      { week: 1, commits: 30, teamRepo: "2026-summer-w1-c4-01", rankChange: 0 },
      { week: 2, commits: 36, teamRepo: "2026-summer-w2-c4-02", rankChange: 1 },
    ],
    totalCommits: 66,
    rank: 14,
    prevRank: 15,
    badges: ["첫 커밋"],
    lastActivity: "2026-07-12T15:00:00+09:00",
  },
  {
    id: "p15",
    name: "류아린",
    githubUsername: "arin-ryu",
    class: "3분반",
    weeklyData: [
      { week: 1, commits: 28, teamRepo: "2026-summer-w1-c3-02", rankChange: 0 },
      { week: 2, commits: 31, teamRepo: "2026-summer-w2-c3-02", rankChange: 2 },
    ],
    totalCommits: 59,
    rank: 15,
    prevRank: 17,
    badges: ["첫 커밋", "문서 정리왕"],
    lastActivity: "2026-07-12T09:40:00+09:00",
  },
  {
    id: "p16",
    name: "문지우",
    githubUsername: "jiwoo-moon",
    class: "4분반",
    weeklyData: [
      { week: 1, commits: 25, teamRepo: "2026-summer-w1-c4-02", rankChange: 0 },
      { week: 2, commits: 29, teamRepo: "2026-summer-w2-c4-01", rankChange: 0 },
    ],
    totalCommits: 54,
    rank: 16,
    prevRank: 16,
    badges: ["첫 커밋"],
    lastActivity: "2026-07-12T12:20:00+09:00",
  },
  {
    id: "p17",
    name: "서지민",
    githubUsername: "jimin-seo",
    class: "4분반",
    weeklyData: [
      { week: 1, commits: 22, teamRepo: "2026-summer-w1-c4-02", rankChange: 0 },
      { week: 2, commits: 24, teamRepo: "2026-summer-w2-c4-02", rankChange: -1 },
    ],
    totalCommits: 46,
    rank: 17,
    prevRank: 16,
    badges: ["첫 커밋"],
    lastActivity: "2026-07-11T20:10:00+09:00",
  },
];

export const teams: TeamStats[] = [
  {
    repo: "2026-summer-w2-c1-02",
    week: 2,
    class: "1분반",
    teamNumber: 2,
    memberIds: ["p1", "p3"],
    totalCommits: 135,
    avgCommitsPerPerson: 67.5,
    lastActivity: "2026-07-12T17:45:00+09:00",
    rank: 1,
    prevRank: 2,
    rankChange: 1,
    commitHistory: [
      { date: "07.09", commits: 12 },
      { date: "07.10", commits: 24 },
      { date: "07.11", commits: 31 },
      { date: "07.12", commits: 45 },
      { date: "07.13", commits: 23 },
    ],
  },
  {
    repo: "2026-summer-w2-c2-01",
    week: 2,
    class: "2분반",
    teamNumber: 1,
    memberIds: ["p2", "p9"],
    totalCommits: 108,
    avgCommitsPerPerson: 54,
    lastActivity: "2026-07-12T19:00:00+09:00",
    rank: 2,
    prevRank: 1,
    rankChange: -1,
    commitHistory: [
      { date: "07.09", commits: 8 },
      { date: "07.10", commits: 20 },
      { date: "07.11", commits: 29 },
      { date: "07.12", commits: 35 },
      { date: "07.13", commits: 16 },
    ],
  },
  {
    repo: "2026-summer-w2-c3-01",
    week: 2,
    class: "3분반",
    teamNumber: 1,
    memberIds: ["p5", "p13"],
    totalCommits: 88,
    avgCommitsPerPerson: 44,
    lastActivity: "2026-07-12T18:55:00+09:00",
    rank: 3,
    prevRank: 4,
    rankChange: 1,
    commitHistory: [
      { date: "07.09", commits: 7 },
      { date: "07.10", commits: 17 },
      { date: "07.11", commits: 25 },
      { date: "07.12", commits: 30 },
      { date: "07.13", commits: 9 },
    ],
  },
  {
    repo: "2026-summer-w2-c2-02",
    week: 2,
    class: "2분반",
    teamNumber: 2,
    memberIds: ["p4", "p12"],
    totalCommits: 96,
    avgCommitsPerPerson: 48,
    lastActivity: "2026-07-12T16:50:00+09:00",
    rank: 4,
    prevRank: 3,
    rankChange: -1,
    commitHistory: [
      { date: "07.09", commits: 9 },
      { date: "07.10", commits: 18 },
      { date: "07.11", commits: 27 },
      { date: "07.12", commits: 33 },
      { date: "07.13", commits: 9 },
    ],
  },
  {
    repo: "2026-summer-w2-c4-01",
    week: 2,
    class: "4분반",
    teamNumber: 1,
    memberIds: ["p7", "p16"],
    totalCommits: 79,
    avgCommitsPerPerson: 39.5,
    lastActivity: "2026-07-12T17:20:00+09:00",
    rank: 5,
    prevRank: 7,
    rankChange: 2,
    commitHistory: [
      { date: "07.09", commits: 5 },
      { date: "07.10", commits: 14 },
      { date: "07.11", commits: 22 },
      { date: "07.12", commits: 28 },
      { date: "07.13", commits: 10 },
    ],
  },
  {
    repo: "2026-summer-w2-c1-03",
    week: 2,
    class: "1분반",
    teamNumber: 3,
    memberIds: ["p6", "p10"],
    totalCommits: 91,
    avgCommitsPerPerson: 45.5,
    lastActivity: "2026-07-12T14:10:00+09:00",
    rank: 6,
    prevRank: 5,
    rankChange: -1,
    commitHistory: [
      { date: "07.09", commits: 10 },
      { date: "07.10", commits: 19 },
      { date: "07.11", commits: 28 },
      { date: "07.12", commits: 26 },
      { date: "07.13", commits: 8 },
    ],
  },
  {
    repo: "2026-summer-w2-c1-01",
    week: 2,
    class: "1분반",
    teamNumber: 1,
    memberIds: ["p8"],
    totalCommits: 45,
    avgCommitsPerPerson: 45,
    lastActivity: "2026-07-12T18:00:00+09:00",
    rank: 7,
    prevRank: 9,
    rankChange: 2,
    commitHistory: [
      { date: "07.09", commits: 4 },
      { date: "07.10", commits: 9 },
      { date: "07.11", commits: 14 },
      { date: "07.12", commits: 13 },
      { date: "07.13", commits: 5 },
    ],
  },
  {
    repo: "2026-summer-w2-c3-02",
    week: 2,
    class: "3분반",
    teamNumber: 2,
    memberIds: ["p11", "p15"],
    totalCommits: 67,
    avgCommitsPerPerson: 33.5,
    lastActivity: "2026-07-12T13:15:00+09:00",
    rank: 8,
    prevRank: 6,
    rankChange: -2,
    commitHistory: [
      { date: "07.09", commits: 6 },
      { date: "07.10", commits: 12 },
      { date: "07.11", commits: 19 },
      { date: "07.12", commits: 22 },
      { date: "07.13", commits: 8 },
    ],
  },
  {
    repo: "2026-summer-w2-c4-02",
    week: 2,
    class: "4분반",
    teamNumber: 2,
    memberIds: ["p14", "p17"],
    totalCommits: 60,
    avgCommitsPerPerson: 30,
    lastActivity: "2026-07-12T15:00:00+09:00",
    rank: 9,
    prevRank: 8,
    rankChange: -1,
    commitHistory: [
      { date: "07.09", commits: 5 },
      { date: "07.10", commits: 11 },
      { date: "07.11", commits: 17 },
      { date: "07.12", commits: 19 },
      { date: "07.13", commits: 8 },
    ],
  },
];

export const classStats: ClassStats[] = [
  {
    class: "1분반",
    totalCommits: 271,
    avgCommitsPerPerson: 54.2,
    memberCount: 5,
    activeRepos: 3,
    prevWeekCommits: 243,
    rank: 1,
    prevRank: 2,
    rankChange: 1,
  },
  {
    class: "2분반",
    totalCommits: 204,
    avgCommitsPerPerson: 51.0,
    memberCount: 4,
    activeRepos: 2,
    prevWeekCommits: 182,
    rank: 2,
    prevRank: 1,
    rankChange: -1,
  },
  {
    class: "3분반",
    totalCommits: 155,
    avgCommitsPerPerson: 38.75,
    memberCount: 4,
    activeRepos: 2,
    prevWeekCommits: 150,
    rank: 3,
    prevRank: 3,
    rankChange: 0,
  },
  {
    class: "4분반",
    totalCommits: 139,
    avgCommitsPerPerson: 34.75,
    memberCount: 4,
    activeRepos: 2,
    prevWeekCommits: 123,
    rank: 4,
    prevRank: 4,
    rankChange: 0,
  },
];

export const activityFeed: ActivityItem[] = [
  {
    id: "a1",
    type: "commit",
    message: "김가온님이 2026-summer-w2-c1-02에 커밋 8개를 추가했습니다.",
    time: "방금 전",
    class: "1분반",
  },
  {
    id: "a2",
    type: "milestone",
    message: "1분반의 이번 주 총 커밋 수가 250개를 돌파했습니다!",
    time: "12분 전",
    class: "1분반",
  },
  {
    id: "a3",
    type: "commit",
    message: "강도현님이 2026-summer-w2-c2-01에 커밋 5개를 추가했습니다.",
    time: "23분 전",
    class: "2분반",
  },
  {
    id: "a4",
    type: "rank-up",
    message: "w2-c3-01 팀이 팀 랭킹 3위로 상승했습니다.",
    time: "41분 전",
    class: "3분반",
  },
  {
    id: "a5",
    type: "sync",
    message: "마지막 동기화 이후 128개의 새 커밋이 반영되었습니다.",
    time: "1시간 전",
  },
  {
    id: "a6",
    type: "commit",
    message: "오태양님이 2026-summer-w2-c3-01에 커밋 7개를 추가했습니다.",
    time: "1시간 12분 전",
    class: "3분반",
  },
  {
    id: "a7",
    type: "milestone",
    message: "2분반의 이번 주 총 커밋 수가 200개를 돌파했습니다!",
    time: "2시간 전",
    class: "2분반",
  },
  {
    id: "a8",
    type: "rank-up",
    message: "남도윤님이 개인 랭킹 7위로 상승했습니다.",
    time: "2시간 30분 전",
    class: "4분반",
  },
  {
    id: "a9",
    type: "commit",
    message: "박하윤님이 2026-summer-w2-c1-03에 커밋 11개를 추가했습니다.",
    time: "3시간 전",
    class: "1분반",
  },
  {
    id: "a10",
    type: "sync",
    message: "GitHub API 동기화가 완료되었습니다. 데이터가 최신 상태입니다.",
    time: "3시간 전",
  },
];

export const weeklyTotals = [
  { week: "1주차", totalCommits: 564, c1: 243, c2: 182, c3: 150, c4: 123 },
  { week: "2주차", totalCommits: 769, c1: 271, c2: 204, c3: 155, c4: 139 },
  { week: "3주차", totalCommits: 0, c1: 0, c2: 0, c3: 0, c4: 0 },
  { week: "4주차", totalCommits: 0, c1: 0, c2: 0, c3: 0, c4: 0 },
];

export const dailyActivity = [
  { date: "07.09", commits: 87 },
  { date: "07.10", commits: 143 },
  { date: "07.11", commits: 198 },
  { date: "07.12", commits: 221 },
  { date: "07.13", commits: 120 },
];

export interface DayActivity {
  date: string;
  dateStr: string;
  commits: number;
  week: number;
  future: boolean;
}

export const campDailyActivity: DayActivity[] = [
  // Week 1
  { date: "07.02", dateStr: "2026-07-02", commits: 45, week: 1, future: false },
  { date: "07.03", dateStr: "2026-07-03", commits: 88, week: 1, future: false },
  { date: "07.04", dateStr: "2026-07-04", commits: 124, week: 1, future: false },
  { date: "07.05", dateStr: "2026-07-05", commits: 71, week: 1, future: false },
  { date: "07.06", dateStr: "2026-07-06", commits: 38, week: 1, future: false },
  { date: "07.07", dateStr: "2026-07-07", commits: 102, week: 1, future: false },
  { date: "07.08", dateStr: "2026-07-08", commits: 96, week: 1, future: false },
  // Week 2 (active, partial)
  { date: "07.09", dateStr: "2026-07-09", commits: 87, week: 2, future: false },
  { date: "07.10", dateStr: "2026-07-10", commits: 143, week: 2, future: false },
  { date: "07.11", dateStr: "2026-07-11", commits: 198, week: 2, future: false },
  { date: "07.12", dateStr: "2026-07-12", commits: 221, week: 2, future: false },
  { date: "07.13", dateStr: "2026-07-13", commits: 120, week: 2, future: false },
  { date: "07.14", dateStr: "2026-07-14", commits: 0, week: 2, future: true },
  { date: "07.15", dateStr: "2026-07-15", commits: 0, week: 2, future: true },
  // Week 3 (upcoming)
  { date: "07.16", dateStr: "2026-07-16", commits: 0, week: 3, future: true },
  { date: "07.17", dateStr: "2026-07-17", commits: 0, week: 3, future: true },
  { date: "07.18", dateStr: "2026-07-18", commits: 0, week: 3, future: true },
  { date: "07.19", dateStr: "2026-07-19", commits: 0, week: 3, future: true },
  { date: "07.20", dateStr: "2026-07-20", commits: 0, week: 3, future: true },
  { date: "07.21", dateStr: "2026-07-21", commits: 0, week: 3, future: true },
  { date: "07.22", dateStr: "2026-07-22", commits: 0, week: 3, future: true },
  // Week 4 (upcoming)
  { date: "07.23", dateStr: "2026-07-23", commits: 0, week: 4, future: true },
  { date: "07.24", dateStr: "2026-07-24", commits: 0, week: 4, future: true },
  { date: "07.25", dateStr: "2026-07-25", commits: 0, week: 4, future: true },
  { date: "07.26", dateStr: "2026-07-26", commits: 0, week: 4, future: true },
  { date: "07.27", dateStr: "2026-07-27", commits: 0, week: 4, future: true },
  { date: "07.28", dateStr: "2026-07-28", commits: 0, week: 4, future: true },
  { date: "07.29", dateStr: "2026-07-29", commits: 0, week: 4, future: true },
  { date: "07.30", dateStr: "2026-07-30", commits: 0, week: 4, future: true },
  { date: "07.31", dateStr: "2026-07-31", commits: 0, week: 4, future: true },
  { date: "08.01", dateStr: "2026-08-01", commits: 0, week: 4, future: true },
  { date: "08.02", dateStr: "2026-08-02", commits: 0, week: 4, future: true },
];

export const syncLogs = [
  { time: "2026-07-12T18:30:00+09:00", status: "success" as const, newCommits: 128, repos: 18, duration: "2.3초" },
  { time: "2026-07-12T17:30:00+09:00", status: "success" as const, newCommits: 95, repos: 18, duration: "2.1초" },
  { time: "2026-07-12T16:30:00+09:00", status: "success" as const, newCommits: 67, repos: 18, duration: "2.4초" },
  { time: "2026-07-12T15:30:00+09:00", status: "delayed" as const, newCommits: 34, repos: 17, duration: "4.8초" },
  { time: "2026-07-12T14:30:00+09:00", status: "success" as const, newCommits: 89, repos: 18, duration: "2.2초" },
];

export const allBadges = [
  { id: "first-commit", name: "첫 커밋", icon: "🌱", description: "첫 번째 커밋을 완료했습니다." },
  { id: "ten-commits", name: "이번 주 10 commits", icon: "🔥", description: "이번 주에 10개 이상의 커밋을 달성했습니다." },
  { id: "steady", name: "꾸준한 기여자", icon: "⭐", description: "3일 연속 활동을 기록했습니다." },
  { id: "night-owl", name: "밤샘 개발자", icon: "🦉", description: "새벽 2시 이후에 커밋을 완료했습니다." },
  { id: "docs-king", name: "문서 정리왕", icon: "📝", description: "README 또는 문서 파일을 정리했습니다." },
  { id: "refactor", name: "리팩토링 장인", icon: "🔧", description: "리팩토링 관련 커밋을 5개 이상 추가했습니다." },
  { id: "sprint", name: "마감 전력질주", icon: "🚀", description: "주차 마지막 날 20개 이상의 커밋을 기록했습니다." },
  { id: "readme", name: "README 정리 완료", icon: "📖", description: "팀 README를 완성했습니다." },
  { id: "first-deploy", name: "첫 배포 성공", icon: "🎉", description: "프로젝트를 처음으로 배포했습니다." },
  { id: "streak", name: "연속 활동", icon: "📅", description: "5일 연속 활동을 기록했습니다." },
];

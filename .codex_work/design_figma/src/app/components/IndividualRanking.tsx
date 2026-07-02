import { TrendingUp, TrendingDown, Minus, Github, ChevronRight } from "lucide-react";
import { participants, config } from "../data/mockData";
import { Podium } from "./Podium";

interface IndividualRankingProps {
  selectedWeek: number | "all";
  selectedClass: string;
  onSelectParticipant: (id: string) => void;
}

function RankChange({ change }: { change: number }) {
  if (change > 0)
    return (
      <span className="flex items-center gap-0.5 text-lime-400" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
        <TrendingUp size={12} />
        {change}
      </span>
    );
  if (change < 0)
    return (
      <span className="flex items-center gap-0.5 text-rose-400" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
        <TrendingDown size={12} />
        {Math.abs(change)}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-gray-600" style={{ fontSize: "0.72rem" }}>
      <Minus size={12} />
    </span>
  );
}

function classColor(cls: string) {
  const map: Record<string, string> = {
    "1분반": "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    "2분반": "text-violet-400 border-violet-500/30 bg-violet-500/10",
    "3분반": "text-lime-400 border-lime-500/30 bg-lime-500/10",
    "4분반": "text-amber-400 border-amber-500/30 bg-amber-500/10",
  };
  return map[cls] ?? "text-gray-400 border-gray-500/30 bg-gray-500/10";
}

function rankStyle(rank: number) {
  if (rank === 1) return { text: "text-amber-400", bg: "bg-amber-500/20 border-amber-400/30 shadow-[0_0_20px_rgba(251,191,36,0.15)]" };
  if (rank === 2) return { text: "text-gray-300", bg: "bg-white/5 border-gray-400/20" };
  if (rank === 3) return { text: "text-amber-600", bg: "bg-amber-900/20 border-amber-700/20" };
  return { text: "text-gray-500", bg: "bg-[#0d1429]/50 border-white/5" };
}

export function IndividualRanking({ selectedWeek, selectedClass, onSelectParticipant }: IndividualRankingProps) {
  const getCommits = (p: (typeof participants)[0]) => {
    if (selectedWeek === "all") return p.totalCommits;
    const wd = p.weeklyData.find((d) => d.week === selectedWeek);
    return wd?.commits ?? 0;
  };

  const getChange = (p: (typeof participants)[0]) => p.rank - p.prevRank;
  const getCurrentTeam = (p: (typeof participants)[0]) => {
    const wd = p.weeklyData.find((d) => d.week === config.currentWeek);
    return wd?.teamRepo?.split("2026-summer-")[1] ?? "—";
  };

  let filtered = [...participants];
  if (selectedClass !== "all") {
    filtered = filtered.filter((p) => p.class === selectedClass);
  }
  filtered = filtered.sort((a, b) => getCommits(b) - getCommits(a));

  return (
    <div className="space-y-6">
      <Podium rankingType="individual" onSelectParticipant={onSelectParticipant} />

      {/* Filter notice */}
      {selectedClass !== "all" && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-2.5 text-sm text-cyan-400">
          {selectedClass} 필터 적용 중 · {filtered.length}명 표시
        </div>
      )}

      {/* Header */}
      <div className="hidden md:grid grid-cols-[40px_1fr_80px_100px_80px_60px_32px] gap-4 px-5 text-gray-600" style={{ fontSize: "0.7rem" }}>
        <span>순위</span>
        <span>참가자</span>
        <span>분반</span>
        <span>현재 팀</span>
        <span className="text-right">커밋</span>
        <span className="text-right">변화</span>
        <span />
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {filtered.map((p, idx) => {
          const rank = idx + 1;
          const commits = getCommits(p);
          const change = getChange(p);
          const rs = rankStyle(rank);
          const team = getCurrentTeam(p);

          return (
            <button
              key={p.id}
              onClick={() => onSelectParticipant(p.id)}
              className={`w-full flex items-center gap-4 rounded-xl border p-4 transition-all group hover:scale-[1.005] ${rs.bg}`}
            >
              {/* Rank */}
              <div className="w-8 shrink-0 text-center" style={{ fontWeight: 700, fontSize: rank <= 3 ? "1.1rem" : "0.875rem" }}>
                <span className={rs.text}>
                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                </span>
              </div>

              {/* Name + username */}
              <div className="flex-1 min-w-0 flex items-center gap-3 text-left">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-white" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                    {p.name[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-white" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    {p.name}
                  </div>
                  <div className="text-gray-500 flex items-center gap-1" style={{ fontSize: "0.72rem" }}>
                    <Github size={10} />
                    {p.githubUsername}
                  </div>
                </div>
              </div>

              {/* Class */}
              <div className="hidden md:block shrink-0">
                <span className={`rounded-full border px-2 py-0.5 ${classColor(p.class)}`} style={{ fontSize: "0.68rem", fontWeight: 600 }}>
                  {p.class}
                </span>
              </div>

              {/* Team */}
              <div className="hidden md:block shrink-0 w-24 text-gray-500" style={{ fontSize: "0.72rem" }}>
                {team}
              </div>

              {/* Commits */}
              <div className="shrink-0 text-right">
                <div className="text-white" style={{ fontWeight: 700, fontSize: "1rem" }}>
                  {commits.toLocaleString()}
                </div>
                <div className="text-gray-600" style={{ fontSize: "0.65rem" }}>
                  커밋
                </div>
              </div>

              {/* Change */}
              <div className="hidden md:flex shrink-0 w-12 justify-end">
                <RankChange change={change} />
              </div>

              {/* Arrow */}
              <ChevronRight size={16} className="text-gray-700 group-hover:text-gray-400 transition-colors shrink-0" />
            </button>
          );
        })}
      </div>

      <p className="text-center text-gray-600" style={{ fontSize: "0.7rem" }}>
        커밋 수는 GitHub 활동량을 보여주는 참고 지표입니다. · 분반 랭킹은 인원 차이를 보정하기 위해 인당 평균 기준으로 표시됩니다.
      </p>
    </div>
  );
}

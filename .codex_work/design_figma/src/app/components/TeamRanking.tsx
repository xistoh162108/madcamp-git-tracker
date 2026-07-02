import { TrendingUp, TrendingDown, Minus, ExternalLink, ChevronRight, Clock } from "lucide-react";
import { teams, participants } from "../data/mockData";
import { Podium } from "./Podium";

interface TeamRankingProps {
  selectedWeek: number | "all";
  selectedClass: string;
  onSelectTeam: (repo: string) => void;
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
    <span className="flex items-center text-gray-600">
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
  if (rank === 1) return "border-amber-400/30 bg-[#0d1429] shadow-[0_0_20px_rgba(251,191,36,0.1)]";
  if (rank === 2) return "border-gray-400/20 bg-[#0d1429]";
  if (rank === 3) return "border-amber-700/20 bg-[#0d1429]";
  return "border-white/5 bg-[#0a0f1e]";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function TeamRanking({ selectedWeek, selectedClass, onSelectTeam }: TeamRankingProps) {
  const getParticipantName = (id: string) => participants.find((p) => p.id === id)?.name ?? id;

  let filtered = selectedWeek === "all"
    ? teams
    : teams.filter((t) => t.week === selectedWeek);
  if (selectedClass !== "all") {
    filtered = filtered.filter((t) => t.class === selectedClass);
  }
  filtered = [...filtered].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-6">
      <Podium rankingType="team" onSelectTeam={onSelectTeam} />

      {selectedClass !== "all" && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-2.5 text-sm text-cyan-400">
          {selectedClass} 필터 적용 중 · {filtered.length}개 팀 표시
        </div>
      )}

      {/* Header */}
      <div className="hidden lg:grid grid-cols-[40px_1fr_80px_120px_90px_90px_80px_60px_32px] gap-3 px-5 text-gray-600" style={{ fontSize: "0.7rem" }}>
        <span>순위</span>
        <span>팀 repo</span>
        <span>분반</span>
        <span>팀원</span>
        <span className="text-right">총 커밋</span>
        <span className="text-right">인당 평균</span>
        <span>최근 활동</span>
        <span className="text-right">변화</span>
        <span />
      </div>

      <div className="space-y-2">
        {filtered.map((t, idx) => {
          const rank = idx + 1;
          const repoShort = t.repo.split("2026-summer-")[1] ?? t.repo;
          return (
            <button
              key={t.repo}
              onClick={() => onSelectTeam(t.repo)}
              className={`w-full flex items-center gap-3 rounded-xl border p-4 transition-all group hover:scale-[1.005] ${rankStyle(rank)}`}
            >
              {/* Rank */}
              <div className="w-8 shrink-0 text-center" style={{ fontWeight: 700, fontSize: rank <= 3 ? "1.1rem" : "0.875rem" }}>
                <span className={rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-gray-500"}>
                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                </span>
              </div>

              {/* Repo name */}
              <div className="flex-1 min-w-0 text-left">
                <div className="text-white font-mono" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                  {repoShort}
                </div>
                <div className="text-gray-500 mt-0.5" style={{ fontSize: "0.68rem" }}>
                  {t.memberIds.length}명 팀
                </div>
              </div>

              {/* Class */}
              <div className="hidden sm:block shrink-0">
                <span className={`rounded-full border px-2 py-0.5 ${classColor(t.class)}`} style={{ fontSize: "0.68rem", fontWeight: 600 }}>
                  {t.class}
                </span>
              </div>

              {/* Members */}
              <div className="hidden lg:flex shrink-0 w-24 flex-wrap gap-1">
                {t.memberIds.map((id) => (
                  <span key={id} className="text-gray-400" style={{ fontSize: "0.7rem" }}>
                    {getParticipantName(id)}
                  </span>
                ))}
              </div>

              {/* Total commits */}
              <div className="shrink-0 text-right">
                <div className="text-white" style={{ fontWeight: 700, fontSize: "1rem" }}>
                  {t.totalCommits.toLocaleString()}
                </div>
                <div className="text-gray-600" style={{ fontSize: "0.65rem" }}>총 커밋</div>
              </div>

              {/* Avg */}
              <div className="hidden md:block shrink-0 text-right w-20">
                <div className="text-cyan-400" style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  {t.avgCommitsPerPerson.toFixed(1)}
                </div>
                <div className="text-gray-600" style={{ fontSize: "0.65rem" }}>인당 평균</div>
              </div>

              {/* Last activity */}
              <div className="hidden lg:flex items-center gap-1 shrink-0 w-20 text-gray-500" style={{ fontSize: "0.7rem" }}>
                <Clock size={11} />
                {formatTime(t.lastActivity)}
              </div>

              {/* Change */}
              <div className="hidden md:flex shrink-0 w-10 justify-end">
                <RankChange change={t.rankChange} />
              </div>

              <ChevronRight size={16} className="text-gray-700 group-hover:text-gray-400 transition-colors shrink-0" />
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p style={{ fontSize: "0.875rem" }}>아직 표시할 팀 기록이 없습니다.</p>
          <p className="mt-1" style={{ fontSize: "0.75rem" }}>팀 repository가 생성되면 이곳에 활동이 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}

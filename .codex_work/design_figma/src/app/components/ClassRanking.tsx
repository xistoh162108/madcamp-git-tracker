import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { classStats } from "../data/mockData";
import { Podium } from "./Podium";

type Metric = "average" | "total";

interface ClassRankingProps {
  selectedWeek: number | "all";
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

const classColors: Record<string, { bar: string; text: string; badge: string }> = {
  "1분반": { bar: "bg-cyan-400", text: "text-cyan-400", badge: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" },
  "2분반": { bar: "bg-violet-400", text: "text-violet-400", badge: "bg-violet-500/10 border-violet-500/30 text-violet-400" },
  "3분반": { bar: "bg-lime-400", text: "text-lime-400", badge: "bg-lime-500/10 border-lime-500/30 text-lime-400" },
  "4분반": { bar: "bg-amber-400", text: "text-amber-400", badge: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
};

function rankStyle(rank: number) {
  if (rank === 1) return "border-amber-400/30 bg-[#0d1429] shadow-[0_0_20px_rgba(251,191,36,0.1)]";
  if (rank === 2) return "border-gray-400/20 bg-[#0d1429]";
  if (rank === 3) return "border-amber-700/20 bg-[#0d1429]";
  return "border-white/5 bg-[#0a0f1e]";
}

export function ClassRanking({ selectedWeek }: ClassRankingProps) {
  const [metric, setMetric] = useState<Metric>("average");

  const sorted = [...classStats].sort((a, b) =>
    metric === "average"
      ? b.avgCommitsPerPerson - a.avgCommitsPerPerson
      : b.totalCommits - a.totalCommits
  );

  const maxVal =
    metric === "average"
      ? Math.max(...sorted.map((c) => c.avgCommitsPerPerson))
      : Math.max(...sorted.map((c) => c.totalCommits));

  return (
    <div className="space-y-6">
      <Podium rankingType="class" />

      {/* Metric toggle */}
      <div className="rounded-xl border border-white/10 bg-[#0a0f1e] p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-gray-300" style={{ fontWeight: 600, fontSize: "0.875rem" }}>
              분반 랭킹 기준
            </p>
            {metric === "average" && (
              <p className="text-gray-500 mt-0.5" style={{ fontSize: "0.72rem" }}>
                분반별 인원 차이를 보정한 기준입니다.
              </p>
            )}
          </div>
          <div className="flex gap-1 rounded-lg border border-white/10 bg-[#070c1b] p-1">
            <button
              onClick={() => setMetric("average")}
              className={`px-4 py-2 rounded-md text-sm transition-all ${
                metric === "average"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              인당 평균 기준
            </button>
            <button
              onClick={() => setMetric("total")}
              className={`px-4 py-2 rounded-md text-sm transition-all ${
                metric === "total"
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              총합 기준
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="hidden md:grid grid-cols-[40px_1fr_100px_100px_80px_80px_60px] gap-4 px-5 text-gray-600" style={{ fontSize: "0.7rem" }}>
        <span>순위</span>
        <span>분반</span>
        <span className="text-right">총 커밋</span>
        <span className="text-right">인당 평균</span>
        <span className="text-right">참가자 수</span>
        <span className="text-right">활성 repo</span>
        <span className="text-right">변화</span>
      </div>

      <div className="space-y-2">
        {sorted.map((c, idx) => {
          const rank = idx + 1;
          const val = metric === "average" ? c.avgCommitsPerPerson : c.totalCommits;
          const barWidth = maxVal > 0 ? (val / maxVal) * 100 : 0;
          const cc = classColors[c.class] ?? classColors["1분반"];

          return (
            <div
              key={c.class}
              className={`rounded-xl border p-5 transition-all ${rankStyle(rank)}`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-8 shrink-0 text-center" style={{ fontWeight: 700, fontSize: rank <= 3 ? "1.1rem" : "0.875rem" }}>
                  <span className={rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-gray-500"}>
                    {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                  </span>
                </div>

                {/* Class name + badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white" style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                      {c.class}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${cc.badge}`} style={{ fontSize: "0.65rem", fontWeight: 600 }}>
                      {c.memberCount}명
                    </span>
                    <span className="text-gray-600" style={{ fontSize: "0.65rem" }}>
                      {c.activeRepos}개 repo
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cc.bar} transition-all duration-700`}
                      style={{ width: `${barWidth}%`, opacity: 0.8 }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-6 shrink-0">
                  <div className="text-right w-20">
                    <div className="text-white" style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      {c.totalCommits.toLocaleString()}
                    </div>
                    <div className="text-gray-600" style={{ fontSize: "0.65rem" }}>총 커밋</div>
                  </div>
                  <div className="text-right w-20">
                    <div className={cc.text} style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      {c.avgCommitsPerPerson.toFixed(1)}
                    </div>
                    <div className="text-gray-600" style={{ fontSize: "0.65rem" }}>인당 평균</div>
                  </div>
                </div>

                {/* Change */}
                <div className="hidden md:flex w-10 justify-end">
                  <RankChange change={c.rankChange} />
                </div>
              </div>

              {/* Mobile stats */}
              <div className="md:hidden mt-3 flex gap-4">
                <div>
                  <div className="text-white" style={{ fontWeight: 700, fontSize: "0.9rem" }}>{c.totalCommits}</div>
                  <div className="text-gray-600" style={{ fontSize: "0.65rem" }}>총 커밋</div>
                </div>
                <div>
                  <div className={cc.text} style={{ fontWeight: 700, fontSize: "0.9rem" }}>{c.avgCommitsPerPerson.toFixed(1)}</div>
                  <div className="text-gray-600" style={{ fontSize: "0.65rem" }}>인당 평균</div>
                </div>
                <div className="ml-auto">
                  <RankChange change={c.rankChange} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-gray-600 space-y-1" style={{ fontSize: "0.7rem" }}>
        <p>분반 랭킹은 인원 차이를 보정하기 위해 기본적으로 인당 평균 기준으로 표시됩니다.</p>
        <p>커밋 수는 GitHub 활동량을 보여주는 참고 지표입니다.</p>
      </div>
    </div>
  );
}

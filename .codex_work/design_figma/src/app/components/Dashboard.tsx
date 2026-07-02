import { useEffect, useRef, useState } from "react";
import { GitCommit, Users, Flame, Building2, RefreshCw, Clock, Timer } from "lucide-react";
import { config, participants, classStats, teams } from "../data/mockData";

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const startTime = performance.now();
    const update = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }, [target, duration]);
  return count;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "cyan",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: "cyan" | "violet" | "lime" | "amber";
}) {
  const colorMap = {
    cyan: { icon: "text-cyan-400", glow: "shadow-[0_0_15px_rgba(34,211,238,0.08)]", border: "border-cyan-500/20" },
    violet: { icon: "text-violet-400", glow: "shadow-[0_0_15px_rgba(167,139,250,0.08)]", border: "border-violet-500/20" },
    lime: { icon: "text-lime-400", glow: "shadow-[0_0_15px_rgba(163,230,53,0.08)]", border: "border-lime-500/20" },
    amber: { icon: "text-amber-400", glow: "shadow-[0_0_15px_rgba(251,191,36,0.08)]", border: "border-amber-500/20" },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-xl border ${c.border} bg-[#0d1429] p-5 ${c.glow} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-gray-500" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
          {label}
        </span>
        <Icon size={16} className={c.icon} />
      </div>
      <div>
        <div className="text-white" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.1 }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {sub && (
          <div className="text-gray-500 mt-1" style={{ fontSize: "0.72rem" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function CountStatCard({
  icon: Icon,
  label,
  target,
  sub,
  color = "cyan",
}: {
  icon: React.ElementType;
  label: string;
  target: number;
  sub?: string;
  color?: "cyan" | "violet" | "lime" | "amber";
}) {
  const count = useCountUp(target);
  return <StatCard icon={Icon} label={label} value={count} sub={sub} color={color} />;
}

function WeekCountdown() {
  const activeWeek = config.weeks.find((w) => w.status === "active");
  if (!activeWeek) return null;

  const endMs = new Date(activeWeek.endAt).getTime();
  const nowMs = Date.now();
  const diffMs = Math.max(0, endMs - nowMs);
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);

  return (
    <div className="rounded-xl border border-amber-500/20 bg-[#0d1429] p-5 shadow-[0_0_15px_rgba(251,191,36,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-500" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
          현재 주차
        </span>
        <Timer size={16} className="text-amber-400" />
      </div>
      <div className="text-white" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
        {activeWeek.label}
      </div>
      <div className="flex items-center gap-1 mt-1">
        <div className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
        <span className="text-lime-400" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
          진행 중
        </span>
      </div>
      <div className="mt-3 text-gray-400" style={{ fontSize: "0.72rem" }}>
        종료까지{" "}
        <span className="text-amber-300" style={{ fontWeight: 600 }}>
          {days}일 {hours}시간 {mins}분
        </span>{" "}
        남음
      </div>
      <div className="mt-1 text-gray-600" style={{ fontSize: "0.65rem" }}>
        집계 기준: KST (Asia/Seoul)
      </div>
    </div>
  );
}

function WeekSelector({
  selectedWeek,
  onSelect,
}: {
  selectedWeek: number | "all";
  onSelect: (w: number | "all") => void;
}) {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect("all")}
        className={`px-4 py-2 rounded-lg text-sm border transition-all ${
          selectedWeek === "all"
            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
            : "border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5"
        }`}
      >
        전체 기간
      </button>
      {config.weeks.map((w) => (
        <button
          key={w.week}
          onClick={() => onSelect(w.week)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${
            selectedWeek === w.week
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
              : w.status === "upcoming"
              ? "border-white/5 text-gray-600 cursor-not-allowed"
              : "border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5"
          }`}
          disabled={w.status === "upcoming"}
        >
          <span>
            {w.label} · {formatDate(w.startAt)} ~ {formatDate(w.endAt)}
          </span>
          {w.status === "active" && (
            <span className="flex items-center gap-1 rounded-full bg-lime-500/20 border border-lime-500/30 px-1.5 py-0.5" style={{ fontSize: "0.62rem", color: "#a3e635", fontWeight: 600 }}>
              <span className="h-1 w-1 rounded-full bg-lime-400 animate-pulse inline-block" />
              진행 중
            </span>
          )}
          {w.status === "ended" && (
            <span className="text-gray-600" style={{ fontSize: "0.62rem" }}>종료</span>
          )}
          {w.status === "upcoming" && (
            <span className="text-gray-700" style={{ fontSize: "0.62rem" }}>예정</span>
          )}
        </button>
      ))}
    </div>
  );
}

interface DashboardProps {
  selectedWeek: number | "all";
  onSelectWeek: (w: number | "all") => void;
}

export function Dashboard({ selectedWeek, onSelectWeek }: DashboardProps) {
  const totalCommits = participants.reduce((s, p) => s + p.totalCommits, 0);
  const currentWeekCommits = participants.reduce((s, p) => {
    const wd = p.weeklyData.find((d) => d.week === config.currentWeek);
    return s + (wd?.commits ?? 0);
  }, 0);
  const topTeam = [...teams].sort((a, b) => a.rank - b.rank)[0];
  const topClass = [...classStats].sort((a, b) => a.rank - b.rank)[0];

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#0d1429] via-[#0a1020] to-[#0d0f1e] p-8 shadow-[0_0_40px_rgba(34,211,238,0.06)]">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-cyan-400" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
              {config.displayName}
            </span>
            <span className="rounded-full border border-lime-500/30 bg-lime-500/10 px-3 py-1 text-lime-400" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
              2주차 · 진행 중
            </span>
          </div>
          <h1 className="text-white mb-2" style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em" }}>
            몰입캠프 GitHub 리더보드
          </h1>
          <p className="text-gray-400 max-w-xl" style={{ fontSize: "0.9rem" }}>
            팀별 repository 활동을 기반으로 이번 주와 전체 기간의 개발 흐름을 확인하세요.
          </p>
          <p className="text-gray-600 mt-3" style={{ fontSize: "0.75rem" }}>
            "GitHub 활동으로 보는 이번 주 몰입도" · 랭킹은 KST 기준 주차 설정에 따라 집계됩니다.
          </p>
          <div className="mt-4 flex items-center gap-2 text-gray-600" style={{ fontSize: "0.72rem" }}>
            <RefreshCw size={12} />
            <span>마지막 업데이트: {formatTime(config.lastSyncAt)} KST</span>
            <span>·</span>
            <span>GitHub 활동은 {config.syncInterval} 자동 반영됩니다.</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <CountStatCard icon={GitCommit} label="전체 커밋 수" target={totalCommits} sub={`${participants.length}명 참여`} color="cyan" />
        <CountStatCard icon={Flame} label="이번 주 커밋" target={currentWeekCommits} sub="2주차 · KST 기준" color="amber" />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            icon={Users}
            label="가장 활발한 팀"
            value={topTeam.repo.split("2026-summer-")[1] ?? topTeam.repo}
            sub={`${topTeam.totalCommits}개 커밋 · ${topTeam.class}`}
            color="violet"
          />
        </div>
        <StatCard
          icon={Building2}
          label="가장 활발한 분반"
          value={topClass.class}
          sub={`인당 평균 ${topClass.avgCommitsPerPerson.toFixed(1)}개`}
          color="lime"
        />
        <CountStatCard icon={GitCommit} label="집계 중인 repo" target={config.totalRepos} sub={`${config.githubOrg}`} color="cyan" />
        <div className="col-span-2 xl:col-span-2">
          <WeekCountdown />
        </div>
      </div>

      {/* Week Selector */}
      <div className="rounded-xl border border-white/10 bg-[#0a0f1e] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-gray-500" />
          <span className="text-gray-400" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
            기간 선택
          </span>
          <span className="text-gray-600" style={{ fontSize: "0.68rem" }}>
            · 설정에서 주차를 관리할 수 있습니다
          </span>
        </div>
        <WeekSelector selectedWeek={selectedWeek} onSelect={onSelectWeek} />
      </div>

      {/* Notice */}
      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3">
        <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
          💡 <span className="text-violet-300">커밋 수는 활동량을 보여주는 참고 지표입니다.</span>{" "}
          작은 커밋, 문서 정리, 기획, 디자인, 디버깅도 모두 중요한 기여입니다.
        </p>
      </div>
    </div>
  );
}

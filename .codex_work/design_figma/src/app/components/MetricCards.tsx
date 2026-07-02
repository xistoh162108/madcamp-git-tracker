import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { participants, classStats, teams, config } from "../data/mockData";

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(e * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <Card className="rounded-xl p-4 gap-1.5">
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">{label}</p>
      <p className="text-foreground font-bold text-2xl tracking-tight leading-none">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-muted-foreground text-[11px]">{sub}</p>}
    </Card>
  );
}

function CountMetricCard({ label, target, sub }: { label: string; target: number; sub?: string }) {
  const count = useCountUp(target);
  return <MetricCard label={label} value={count} sub={sub} />;
}

interface MetricCardsProps {
  selectedWeek: number | "all";
}

export function MetricCards({ selectedWeek }: MetricCardsProps) {
  const totalCommits = participants.reduce((s, p) => s + p.totalCommits, 0);
  const weekCommits = participants.reduce((s, p) => {
    if (selectedWeek === "all") return s + p.totalCommits;
    const wd = p.weeklyData.find((d) => d.week === selectedWeek);
    return s + (wd?.commits ?? 0);
  }, 0);

  const topTeam = [...teams].sort((a, b) => a.rank - b.rank)[0];
  const topClass = [...classStats].sort((a, b) => a.rank - b.rank)[0];
  const topRepoShort = topTeam?.repo.split("2026-summer-")[1] ?? "—";
  const weekLabel = selectedWeek === "all" ? "전체" : `${selectedWeek}주차`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <CountMetricCard label="전체 커밋" target={totalCommits} sub={`${participants.length}명 참여`} />
      <CountMetricCard
        label={`${weekLabel} 커밋`}
        target={weekCommits}
        sub={selectedWeek === "all" ? "전체 기간" : `${config.weeks.find(w => w.week === selectedWeek)?.label ?? ""} KST 기준`}
      />
      <CountMetricCard label="활성 Repo" target={config.totalRepos} sub={config.githubOrg} />
      <CountMetricCard label="참여자 수" target={participants.length} sub="4개 분반" />
      <MetricCard
        label="가장 활발한 팀"
        value={topRepoShort}
        sub={`${topTeam?.totalCommits}커밋 · ${topTeam?.class}`}
      />
      <MetricCard
        label="가장 활발한 분반"
        value={topClass?.class ?? "—"}
        sub={`인당 ${topClass?.avgCommitsPerPerson.toFixed(1)}커밋`}
      />
    </div>
  );
}

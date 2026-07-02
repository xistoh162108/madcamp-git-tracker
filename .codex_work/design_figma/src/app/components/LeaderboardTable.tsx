import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { cn } from "./ui/utils";
import { participants, teams, classStats, config } from "../data/mockData";

type Tab = "individual" | "team" | "class";
type ClassMetric = "average" | "total";

interface Props {
  tab: Tab;
  selectedWeek: number | "all";
  selectedClass: string;
  classMetric: ClassMetric;
  onTabChange: (t: Tab) => void;
  onClassMetricChange: (m: ClassMetric) => void;
  onSelectParticipant: (id: string) => void;
  onSelectTeam: (repo: string) => void;
  onFilterClassChange: (c: string) => void;
}

// ── class badge color map (custom variant via className) ──
const classStyle: Record<string, string> = {
  "1분반": "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  "2분반": "border-violet-500/30 bg-violet-500/10 text-violet-400",
  "3분반": "border-green-500/30 bg-green-500/10 text-green-400",
  "4분반": "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
};

function ClassBadge({ cls }: { cls: string }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold", classStyle[cls])}>
      {cls}
    </Badge>
  );
}

function Delta({ v }: { v: number }) {
  if (v > 0)
    return <span className="flex items-center gap-0.5 text-green-500 text-[11px] font-semibold"><TrendingUp className="size-3" />{v}</span>;
  if (v < 0)
    return <span className="flex items-center gap-0.5 text-rose-400 text-[11px] font-semibold"><TrendingDown className="size-3" />{Math.abs(v)}</span>;
  return <span className="text-muted-foreground/50"><Minus className="size-3" /></span>;
}

function Rank({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-sm">🥇</span>;
  if (rank === 2) return <span className="text-sm">🥈</span>;
  if (rank === 3) return <span className="text-sm">🥉</span>;
  return <span className="text-muted-foreground text-sm font-semibold">{rank}</span>;
}

function Avatar({ name, cls }: { name: string; cls?: string }) {
  const gradMap: Record<string, string> = {
    "1분반": "from-cyan-500/30 to-blue-600/30",
    "2분반": "from-violet-500/30 to-purple-600/30",
    "3분반": "from-green-500/30 to-emerald-600/30",
    "4분반": "from-yellow-500/30 to-orange-500/30",
  };
  const grad = cls ? (gradMap[cls] ?? "from-slate-600/30 to-slate-700/30") : "from-slate-600/30 to-slate-700/30";
  return (
    <div className={cn("size-8 rounded-full border border-border flex items-center justify-center shrink-0 bg-gradient-to-br", grad)}>
      <span className="text-foreground text-xs font-bold">{name[0]}</span>
    </div>
  );
}

function timeAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "방금";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Row components ──

function IndividualRows({ selectedWeek, selectedClass, onSelect }: {
  selectedWeek: number | "all"; selectedClass: string; onSelect: (id: string) => void;
}) {
  let list = [...participants];
  if (selectedClass !== "all") list = list.filter(p => p.class === selectedClass);
  list.sort((a, b) => {
    if (selectedWeek === "all") return b.totalCommits - a.totalCommits;
    return (b.weeklyData.find(d => d.week === selectedWeek)?.commits ?? 0) -
           (a.weeklyData.find(d => d.week === selectedWeek)?.commits ?? 0);
  });

  return (
    <>
      {/* Header */}
      <div className="hidden lg:grid grid-cols-[32px_1fr_72px_120px_56px_48px_48px_28px] gap-3 px-4 py-2 text-muted-foreground text-[10px] uppercase tracking-wider border-b border-border">
        <span>#</span><span>참가자</span><span>분반</span><span>현재 팀</span>
        <span className="text-right">커밋</span><span className="text-right">활동일</span>
        <span className="text-right">최근</span><span />
      </div>
      {list.map((p, idx) => {
        const rank = idx + 1;
        const commits = selectedWeek === "all" ? p.totalCommits : (p.weeklyData.find(d => d.week === selectedWeek)?.commits ?? 0);
        const delta = p.rank - p.prevRank;
        const team = p.weeklyData.find(d => d.week === config.currentWeek)?.teamRepo?.split("2026-summer-")[1] ?? "—";
        const activeDays = Math.min(p.weeklyData.filter(d => d.commits > 0).length * 3 + 1, 7);

        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "w-full group hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0",
              rank <= 3 && "bg-muted/30"
            )}
          >
            {/* Desktop */}
            <div className="hidden lg:grid grid-cols-[32px_1fr_72px_120px_56px_48px_48px_28px] gap-3 items-center px-4 py-3">
              <div className="flex justify-center"><Rank rank={rank} /></div>
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={p.name} cls={p.class} />
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{p.name}</p>
                  <p className="text-muted-foreground text-[11px] truncate">@{p.githubUsername}</p>
                </div>
              </div>
              <div><ClassBadge cls={p.class} /></div>
              <p className="text-muted-foreground font-mono text-[11px] truncate">{team}</p>
              <p className="text-right text-foreground font-bold">{commits.toLocaleString()}</p>
              <p className="text-right text-muted-foreground text-sm">{activeDays}일</p>
              <p className="text-right text-muted-foreground text-[11px] flex items-center justify-end gap-0.5">
                <Clock className="size-2.5" />{timeAgo(p.lastActivity)}
              </p>
              <div className="flex justify-end"><Delta v={delta} /></div>
            </div>
            {/* Mobile */}
            <div className="lg:hidden flex items-center gap-3 px-4 py-3">
              <div className="w-6 shrink-0 text-center"><Rank rank={rank} /></div>
              <Avatar name={p.name} cls={p.class} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <ClassBadge cls={p.class} />
                  <span className="text-muted-foreground text-[11px]">@{p.githubUsername}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-foreground font-bold">{commits}</p>
                <p className="text-muted-foreground text-[11px]">커밋</p>
              </div>
              <Delta v={delta} />
            </div>
          </button>
        );
      })}
    </>
  );
}

function TeamRows({ selectedWeek, selectedClass, onSelect }: {
  selectedWeek: number | "all"; selectedClass: string; onSelect: (repo: string) => void;
}) {
  let list = selectedWeek === "all" ? teams : teams.filter(t => t.week === selectedWeek);
  if (selectedClass !== "all") list = list.filter(t => t.class === selectedClass);
  list = [...list].sort((a, b) => a.rank - b.rank);

  return (
    <>
      <div className="hidden lg:grid grid-cols-[32px_1fr_72px_40px_64px_72px_48px_48px] gap-3 px-4 py-2 text-muted-foreground text-[10px] uppercase tracking-wider border-b border-border">
        <span>#</span><span>팀 repo</span><span>분반</span><span>인원</span>
        <span className="text-right">총 커밋</span><span className="text-right">인당 평균</span>
        <span className="text-right">활동일</span><span className="text-right">최근</span>
      </div>
      {list.map((t, idx) => {
        const rank = idx + 1;
        const repoShort = t.repo.split("2026-summer-")[1] ?? t.repo;
        const activeDays = Math.min(Math.round(t.totalCommits / 20), 7);
        return (
          <button
            key={t.repo}
            onClick={() => onSelect(t.repo)}
            className={cn(
              "w-full group hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0",
              rank <= 3 && "bg-muted/30"
            )}
          >
            <div className="hidden lg:grid grid-cols-[32px_1fr_72px_40px_64px_72px_48px_48px] gap-3 items-center px-4 py-3">
              <div className="flex justify-center"><Rank rank={rank} /></div>
              <p className="text-foreground font-mono text-sm font-medium truncate">{repoShort}</p>
              <div><ClassBadge cls={t.class} /></div>
              <p className="text-muted-foreground text-sm text-center">{t.memberIds.length}명</p>
              <p className="text-right text-foreground font-bold">{t.totalCommits.toLocaleString()}</p>
              <p className="text-right text-primary font-semibold text-sm">{t.avgCommitsPerPerson.toFixed(1)}</p>
              <p className="text-right text-muted-foreground text-sm">{activeDays}일</p>
              <p className="text-right text-muted-foreground text-[11px] flex items-center justify-end gap-0.5">
                <Clock className="size-2.5" />{timeAgo(t.lastActivity)}
              </p>
            </div>
            {/* Mobile */}
            <div className="lg:hidden flex items-center gap-3 px-4 py-3">
              <div className="w-6 shrink-0 text-center"><Rank rank={rank} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-mono text-sm font-medium truncate">{repoShort}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <ClassBadge cls={t.class} />
                  <span className="text-muted-foreground text-[11px]">{t.memberIds.length}명</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-foreground font-bold">{t.totalCommits}</p>
                <p className="text-muted-foreground text-[11px]">커밋</p>
              </div>
              <Delta v={t.rankChange} />
            </div>
          </button>
        );
      })}
      {list.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          아직 표시할 팀 기록이 없습니다.
        </div>
      )}
    </>
  );
}

const classBarColor: Record<string, string> = {
  "1분반": "bg-cyan-400",
  "2분반": "bg-violet-400",
  "3분반": "bg-green-400",
  "4분반": "bg-yellow-400",
};

function ClassRows({ metric }: { metric: ClassMetric }) {
  const list = [...classStats].sort((a, b) =>
    metric === "average" ? b.avgCommitsPerPerson - a.avgCommitsPerPerson : b.totalCommits - a.totalCommits
  );
  const maxVal = metric === "average"
    ? Math.max(...list.map(c => c.avgCommitsPerPerson))
    : Math.max(...list.map(c => c.totalCommits));

  return (
    <>
      <div className="hidden lg:grid grid-cols-[32px_1fr_48px_56px_72px_72px_52px] gap-3 px-4 py-2 text-muted-foreground text-[10px] uppercase tracking-wider border-b border-border">
        <span>#</span><span>분반</span><span>인원</span><span>Repo</span>
        <span className="text-right">총 커밋</span><span className="text-right">인당 평균</span>
        <span className="text-right">변화</span>
      </div>
      {list.map((c, idx) => {
        const rank = idx + 1;
        const val = metric === "average" ? c.avgCommitsPerPerson : c.totalCommits;
        const barW = maxVal > 0 ? (val / maxVal) * 100 : 0;
        const barColor = classBarColor[c.class] ?? "bg-slate-400";

        return (
          <div
            key={c.class}
            className={cn(
              "border-b border-border/50 last:border-0",
              rank <= 3 && "bg-muted/30"
            )}
          >
            <div className="hidden lg:grid grid-cols-[32px_1fr_48px_56px_72px_72px_52px] gap-3 items-center px-4 py-4">
              <div className="flex justify-center"><Rank rank={rank} /></div>
              <div>
                <div className="mb-2"><ClassBadge cls={c.class} /></div>
                <div className="h-1 w-full max-w-[200px] rounded-full bg-border overflow-hidden">
                  <div className={cn("h-full rounded-full opacity-70", barColor)} style={{ width: `${barW}%` }} />
                </div>
              </div>
              <p className="text-muted-foreground text-sm text-center">{c.memberCount}명</p>
              <p className="text-muted-foreground text-sm text-center">{c.activeRepos}개</p>
              <p className="text-right text-foreground font-bold">{c.totalCommits.toLocaleString()}</p>
              <p className="text-right text-primary font-semibold">{c.avgCommitsPerPerson.toFixed(1)}</p>
              <div className="flex justify-end"><Delta v={c.rankChange} /></div>
            </div>
            {/* Mobile */}
            <div className="lg:hidden flex items-center gap-3 px-4 py-3">
              <div className="w-6 shrink-0 text-center"><Rank rank={rank} /></div>
              <div className="flex-1">
                <ClassBadge cls={c.class} />
                <div className={cn("h-1 mt-2 rounded-full opacity-70", barColor)} style={{ width: `${barW}%` }} />
              </div>
              <div className="text-right shrink-0">
                <p className="text-foreground font-bold">
                  {metric === "average" ? c.avgCommitsPerPerson.toFixed(1) : c.totalCommits}
                </p>
                <p className="text-muted-foreground text-[11px]">{metric === "average" ? "인당 평균" : "총 커밋"}</p>
              </div>
              <Delta v={c.rankChange} />
            </div>
          </div>
        );
      })}
    </>
  );
}

const classOptions = ["all", "1분반", "2분반", "3분반", "4분반"];

export function LeaderboardTable({
  tab, selectedWeek, selectedClass, classMetric,
  onTabChange, onClassMetricChange, onSelectParticipant, onSelectTeam, onFilterClassChange,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as Tab)}>
          <TabsList className="h-8">
            <TabsTrigger value="individual" className="text-xs px-3">개인</TabsTrigger>
            <TabsTrigger value="team" className="text-xs px-3">팀</TabsTrigger>
            <TabsTrigger value="class" className="text-xs px-3">분반</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Class filter */}
          <div className="flex gap-0.5">
            {classOptions.map(c => (
              <Button
                key={c}
                variant={selectedClass === c ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onFilterClassChange(c)}
                className="text-xs px-2.5 h-7"
              >
                {c === "all" ? "전체" : c}
              </Button>
            ))}
          </div>

          {/* Class metric toggle — only for class tab */}
          {tab === "class" && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <div className="flex gap-0.5">
                <Button
                  variant={classMetric === "average" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onClassMetricChange("average")}
                  className="text-xs h-7 px-2.5"
                >
                  인당 평균
                </Button>
                <Button
                  variant={classMetric === "total" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onClassMetricChange("total")}
                  className="text-xs h-7 px-2.5"
                >
                  총합
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Class notice */}
      {tab === "class" && classMetric === "average" && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border">
          <p className="text-muted-foreground text-[11px]">
            분반 랭킹은 인원 차이를 보정하기 위해 기본적으로 인당 평균 기준으로 표시됩니다.
          </p>
        </div>
      )}

      {/* Rows */}
      <div>
        {tab === "individual" && (
          <IndividualRows selectedWeek={selectedWeek} selectedClass={selectedClass} onSelect={onSelectParticipant} />
        )}
        {tab === "team" && (
          <TeamRows selectedWeek={selectedWeek} selectedClass={selectedClass} onSelect={onSelectTeam} />
        )}
        {tab === "class" && <ClassRows metric={classMetric} />}
      </div>

      {/* Footer notice */}
      <div className="px-4 py-2.5 border-t border-border bg-muted/20">
        <p className="text-muted-foreground text-[11px]">
          커밋 수는 GitHub 활동량을 보여주는 참고 지표입니다. 작은 커밋, 문서 정리, 기획, 디자인, 디버깅도 모두 중요한 기여입니다.
        </p>
      </div>
    </div>
  );
}

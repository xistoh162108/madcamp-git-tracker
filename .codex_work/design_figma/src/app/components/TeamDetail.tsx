import { Github, ExternalLink, GitCommit, Users } from "lucide-react";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { cn } from "./ui/utils";
import { teams, participants } from "../data/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  repo: string;
  onBack: () => void;
  onSelectParticipant: (id: string) => void;
}

const classBadge: Record<string, string> = {
  "1분반": "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  "2분반": "border-violet-500/30 bg-violet-500/10 text-violet-400",
  "3분반": "border-green-500/30 bg-green-500/10 text-green-400",
  "4분반": "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
};

function timeAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "방금";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl text-xs">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-primary font-semibold mt-0.5">{payload[0].value}개 커밋</p>
    </div>
  );
};

export function TeamDetail({ repo, onBack, onSelectParticipant }: Props) {
  const team = teams.find(t => t.repo === repo);
  if (!team) return (
    <div className="text-center py-20 text-muted-foreground text-sm">
      팀 정보를 찾을 수 없습니다.
      <Button variant="ghost" size="sm" onClick={onBack} className="block mt-3 mx-auto text-primary">돌아가기</Button>
    </div>
  );

  const members = team.memberIds.map(id => participants.find(p => p.id === id)).filter(Boolean) as typeof participants;
  const repoShort = team.repo.split("2026-summer-")[1] ?? team.repo;
  const maxMemberCommits = Math.max(...members.map(m => m.weeklyData.find(d => d.week === team.week)?.commits ?? 0), 1);

  const stats = [
    { label: "총 커밋 수", value: team.totalCommits.toString(), className: "text-primary" },
    { label: "인당 평균", value: team.avgCommitsPerPerson.toFixed(1), className: "text-violet-400" },
    { label: "팀 랭킹", value: `#${team.rank}`, className: "text-foreground" },
    { label: "마지막 활동", value: timeAgo(team.lastActivity), className: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="rounded-xl gap-0 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn("text-[10px] font-semibold", classBadge[team.class] ?? "")}>
                {team.class}
              </Badge>
              <span className="text-muted-foreground text-xs">{team.week}주차</span>
            </div>
            <h2 className="text-foreground font-bold font-mono text-2xl">{repoShort}</h2>
            <p className="text-muted-foreground text-xs mt-1">{team.repo}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`https://github.com/madcamp-official/${team.repo}`} target="_blank" rel="noopener noreferrer">
              <Github className="size-3.5" /> GitHub <ExternalLink className="size-3" />
            </a>
          </Button>
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          {stats.map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{s.label}</p>
              <p className={cn("font-bold text-xl mt-1 leading-none", s.className)}>{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
        {/* Chart */}
        <Card className="rounded-xl gap-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <CardTitle className="text-sm font-semibold">날짜별 커밋 추이</CardTitle>
          </div>
          <div className="p-5 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={team.commitHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="commits" stroke="hsl(var(--primary))" strokeWidth={1.5}
                  dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Members */}
        <Card className="rounded-xl gap-0 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
            <Users className="size-3.5 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">팀원별 활동</CardTitle>
          </div>
          <div className="p-4 space-y-3.5">
            {members.map(m => {
              const commits = m.weeklyData.find(d => d.week === team.week)?.commits ?? 0;
              const barW = (commits / maxMemberCommits) * 100;
              return (
                <button key={m.id} onClick={() => onSelectParticipant(m.id)} className="w-full text-left group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="size-7 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 border border-border flex items-center justify-center shrink-0">
                      <span className="text-foreground text-xs font-bold">{m.name[0]}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-foreground group-hover:text-primary transition-colors text-sm font-medium">{m.name}</span>
                      <span className="text-muted-foreground text-[11px] ml-2">@{m.githubUsername}</span>
                    </div>
                    <span className="text-primary font-bold text-sm shrink-0">{commits}</span>
                  </div>
                  <div className="ml-9 h-1 w-full rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${barW}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="rounded-xl gap-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <GitCommit className="size-3.5 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">최근 활동</CardTitle>
        </div>
        <div>
          {[
            { msg: `${members[0]?.name ?? "팀원"}님이 코드를 업데이트했습니다.`, time: "방금" },
            { msg: `${members[members.length - 1]?.name ?? "팀원"}님이 새 기능을 추가했습니다.`, time: "1시간 전" },
            { msg: "팀 README가 업데이트되었습니다.", time: "3시간 전" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-0">
              <GitCommit className="size-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-muted-foreground text-sm">{item.msg}</span>
              <span className="text-muted-foreground/60 text-[11px] shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-2.5 bg-muted/20">
          <p className="text-muted-foreground text-[10px]">실제 커밋 메시지는 개인정보 보호를 위해 표시되지 않습니다.</p>
        </div>
      </Card>
    </div>
  );
}

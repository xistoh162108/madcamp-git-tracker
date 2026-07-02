import { Github, ExternalLink, Award } from "lucide-react";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { cn } from "./ui/utils";
import { participants, allBadges, config } from "../data/mockData";

interface Props {
  participantId: string;
  onBack: () => void;
  onSelectTeam: (repo: string) => void;
}

const classBadge: Record<string, string> = {
  "1분반": "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  "2분반": "border-violet-500/30 bg-violet-500/10 text-violet-400",
  "3분반": "border-green-500/30 bg-green-500/10 text-green-400",
  "4분반": "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
};

const weekStatusStyle: Record<string, { text: string; border: string }> = {
  ended:    { text: "text-muted-foreground", border: "border-border" },
  active:   { text: "text-green-400",        border: "border-green-500/20 bg-green-500/5" },
  upcoming: { text: "text-muted-foreground/40", border: "border-border/40" },
};

const statusLabel: Record<string, string> = { ended: "종료", active: "진행 중", upcoming: "예정" };

function timeAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function ParticipantDetail({ participantId, onBack, onSelectTeam }: Props) {
  const p = participants.find(x => x.id === participantId);
  if (!p) return (
    <div className="text-center py-20 text-muted-foreground text-sm">
      참가자 정보를 찾을 수 없습니다.
      <Button variant="ghost" size="sm" onClick={onBack} className="block mt-3 mx-auto text-primary">돌아가기</Button>
    </div>
  );

  const maxCommits = Math.max(...p.weeklyData.map(d => d.commits), 1);
  const allWeekHistory = config.weeks.map(w => {
    const wd = p.weeklyData.find(d => d.week === w.week);
    return { ...w, commits: wd?.commits ?? null, teamRepo: wd?.teamRepo ?? null };
  });

  return (
    <div className="space-y-4">
      {/* Profile */}
      <Card className="rounded-xl gap-0 p-5">
        <div className="flex flex-wrap items-start gap-5">
          <div className="size-14 rounded-full bg-gradient-to-br from-primary/25 to-violet-500/30 border border-border flex items-center justify-center shrink-0">
            <span className="text-foreground text-2xl font-bold">{p.name[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="outline" className={cn("text-[10px] font-semibold", classBadge[p.class] ?? "")}>
                {p.class}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                #{p.rank} 전체 순위
              </Badge>
            </div>
            <h2 className="text-foreground font-bold text-2xl">{p.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Github className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">@{p.githubUsername}</span>
              <a href={`https://github.com/${p.githubUsername}`} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground/50 hover:text-primary transition-colors">
                <ExternalLink className="size-3" />
              </a>
            </div>
            <p className="text-muted-foreground text-xs mt-1">마지막 활동: {timeAgo(p.lastActivity)}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-5 py-3 text-center shrink-0">
            <p className="text-primary font-bold text-3xl leading-none">{p.totalCommits}</p>
            <p className="text-muted-foreground text-xs mt-1">전체 커밋</p>
          </div>
        </div>
      </Card>

      {/* Weekly history */}
      <Card className="rounded-xl gap-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <CardTitle className="text-sm font-semibold">주차별 활동 이력</CardTitle>
        </div>
        <div className="p-4 space-y-2">
          {allWeekHistory.map(w => {
            const sc = weekStatusStyle[w.status];
            const commits = w.commits ?? 0;
            const barW = maxCommits > 0 && commits > 0 ? (commits / maxCommits) * 100 : 0;
            const repoShort = w.teamRepo?.split("2026-summer-")[1] ?? null;

            return (
              <div key={w.week} className={cn("rounded-lg border p-3.5", sc.border)}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <span className={cn("text-sm font-semibold", sc.text)}>{w.label}</span>
                    {w.status === "active" && <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {commits > 0 ? (
                      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${barW}%` }} />
                      </div>
                    ) : (
                      <div className="h-1 rounded-full bg-border/40" />
                    )}
                  </div>
                  {repoShort ? (
                    <button onClick={() => w.teamRepo && onSelectTeam(w.teamRepo)}
                      className="text-primary hover:underline font-mono text-[11px] shrink-0">
                      {repoShort}
                    </button>
                  ) : (
                    <span className="text-muted-foreground/30 font-mono text-[11px] shrink-0">
                      {w.status === "upcoming" ? "예정" : "—"}
                    </span>
                  )}
                  <span className={cn("w-10 text-right font-bold text-sm shrink-0", sc.text)}>
                    {w.commits !== null ? w.commits : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Badges */}
      <Card className="rounded-xl gap-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Award className="size-3.5 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">활동 배지</CardTitle>
          <span className="text-muted-foreground text-[10px]">· 재미 요소이며 평가 지표가 아닙니다</span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {p.badges.map(badgeName => {
              const badge = allBadges.find(b => b.name === badgeName);
              return (
                <div key={badgeName} title={badge?.description}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 hover:bg-accent transition-colors cursor-default">
                  <span className="text-sm">{badge?.icon ?? "⭐"}</span>
                  <span className="text-muted-foreground text-xs">{badgeName}</span>
                </div>
              );
            })}
            {p.badges.length === 0 && (
              <p className="text-muted-foreground text-sm">아직 획득한 배지가 없습니다.</p>
            )}
          </div>

          <Separator className="my-4" />

          <p className="text-muted-foreground text-[10px] mb-2">미획득 배지</p>
          <div className="flex flex-wrap gap-2">
            {allBadges.filter(b => !p.badges.includes(b.name)).map(badge => (
              <div key={badge.id} className="flex items-center gap-1.5 rounded-full border border-border/40 px-3 py-1.5 opacity-30">
                <span className="text-sm">{badge.icon}</span>
                <span className="text-muted-foreground text-xs">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

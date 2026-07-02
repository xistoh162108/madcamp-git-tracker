import { GitCommit, TrendingUp, Star, RefreshCw, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { cn } from "./ui/utils";
import { activityFeed, config } from "../data/mockData";

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const iconMap = {
  commit: GitCommit,
  milestone: Star,
  "rank-up": TrendingUp,
  sync: RefreshCw,
} as const;

const iconColorMap: Record<string, string> = {
  commit: "text-primary",
  milestone: "text-yellow-400",
  "rank-up": "text-green-500",
  sync: "text-muted-foreground",
};

const classDot: Record<string, string> = {
  "1분반": "bg-cyan-400",
  "2분반": "bg-violet-400",
  "3분반": "bg-green-400",
  "4분반": "bg-yellow-400",
};

const todayHighlights = [
  { label: "오늘 총 커밋", value: "221", sub: "07.12 기준" },
  { label: "최근 24h 신규", value: "128", sub: "마지막 동기화 이후" },
  { label: "활발한 팀", value: "w2-c1-02", sub: "74커밋" },
  { label: "순위 상승", value: "3명", sub: "최근 24시간" },
];

const ratePercent = Math.round((config.githubRateLimit.remaining / config.githubRateLimit.total) * 100);

export function RightPanel() {
  return (
    <div className="flex flex-col gap-4">
      {/* Daily Highlights */}
      <Card className="rounded-xl gap-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">오늘의 활동</CardTitle>
          <span className="text-muted-foreground text-[10px]">최근 24시간 하이라이트</span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border">
          {todayHighlights.map((h) => (
            <div key={h.label} className="bg-card px-3 py-3">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{h.label}</p>
              <p className="text-foreground font-bold text-lg mt-1 leading-none">{h.value}</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">{h.sub}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Activity Feed */}
      <Card className="rounded-xl gap-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
          <CardTitle className="text-sm font-semibold">최근 GitHub 활동</CardTitle>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {activityFeed.map((item) => {
            const Icon = iconMap[item.type as keyof typeof iconMap] ?? GitCommit;
            const iconColor = iconColorMap[item.type] ?? "text-muted-foreground";
            return (
              <div key={item.id} className="flex items-start gap-2.5 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                <Icon className={cn("size-3.5 mt-0.5 shrink-0", iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground text-xs leading-snug">{item.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground/60 text-[10px]">{item.time}</span>
                    {item.class && (
                      <span className="flex items-center gap-1">
                        <span className={cn("size-1 rounded-full", classDot[item.class] ?? "bg-muted-foreground")} />
                        <span className="text-muted-foreground text-[10px]">{item.class}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-2 bg-muted/20">
          <p className="text-muted-foreground text-[10px]">실제 커밋 메시지는 표시되지 않습니다. 활동 요약만 제공됩니다.</p>
        </div>
      </Card>

      {/* Sync Status */}
      <Card className="rounded-xl gap-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <CheckCircle className="size-3.5 text-green-500" />
          <CardTitle className="text-sm font-semibold">동기화 상태</CardTitle>
        </div>
        <div className="p-4 space-y-3">
          {[
            { label: "마지막 업데이트", value: `${fmt(config.lastSyncAt)} KST` },
            { label: "다음 동기화", value: `${fmt(config.nextSyncAt)} KST` },
            { label: "이번 동기화 반영", value: `${config.lastSyncCommits}개 커밋` },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">{row.label}</span>
              <span className="text-foreground text-xs font-medium">{row.value}</span>
            </div>
          ))}
          <Separator />
          {/* Rate limit bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-muted-foreground text-xs">GitHub API</span>
              <span className="text-muted-foreground text-[10px]">
                {config.githubRateLimit.remaining.toLocaleString()} / {config.githubRateLimit.total.toLocaleString()}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all"
                style={{ width: `${ratePercent}%` }}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-[10px]">
            GitHub 활동은 {config.syncInterval} 자동 반영됩니다. 현재 데이터는 마지막 동기화 시점 기준입니다.
          </p>
        </div>
      </Card>
    </div>
  );
}

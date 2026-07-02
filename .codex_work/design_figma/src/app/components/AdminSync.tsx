import { RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { cn } from "./ui/utils";
import { config, syncLogs } from "../data/mockData";
import { useState } from "react";

const statusConfig = {
  success: { icon: CheckCircle, color: "text-green-500", badgeClass: "border-green-500/30 bg-green-500/10 text-green-400", label: "성공" },
  delayed: { icon: AlertTriangle, color: "text-yellow-400", badgeClass: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400", label: "지연" },
  failed:  { icon: XCircle,    color: "text-rose-400",   badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-400",   label: "실패" },
};

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AdminSync() {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const triggerSync = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); setSynced(true); setTimeout(() => setSynced(false), 2500); }, 1800);
  };

  const ratePercent = Math.round((config.githubRateLimit.remaining / config.githubRateLimit.total) * 100);
  const rateColor = ratePercent > 50 ? "bg-green-500" : ratePercent > 20 ? "bg-yellow-400" : "bg-rose-400";

  const overviewStats = [
    { label: "동기화 상태", value: "정상", color: "text-green-500", sub: "모든 repo 수집 중" },
    { label: "마지막 동기화", value: fmt(config.lastSyncAt), color: "text-foreground", sub: "KST 기준" },
    { label: "이번 반영", value: `${config.lastSyncCommits}개`, color: "text-primary", sub: "새 커밋" },
    { label: "집계 Repo", value: `${config.totalRepos}개`, color: "text-foreground", sub: "정상 수집 중" },
  ];

  return (
    <div className="space-y-3">
      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {overviewStats.map(s => (
          <Card key={s.label} className="rounded-xl p-4 gap-1.5">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{s.label}</p>
            <p className={cn("font-bold text-base leading-tight", s.color)}>{s.value}</p>
            <p className="text-muted-foreground text-[11px]">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Manual sync + schedule */}
      <Card className="rounded-xl gap-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">동기화 제어</CardTitle>
          <Button
            variant={synced ? "outline" : "secondary"}
            size="sm"
            onClick={triggerSync}
            disabled={syncing}
            className={cn(synced && "border-green-500/30 text-green-400")}
          >
            <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
            {synced ? "완료" : syncing ? "동기화 중..." : "수동 동기화"}
          </Button>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: "다음 동기화 예정", value: `${fmt(config.nextSyncAt)} KST` },
            { label: "동기화 주기", value: config.syncInterval },
            { label: "기준 시간대", value: "Asia/Seoul (KST, UTC+9)" },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-muted-foreground text-sm">{row.label}</span>
              <span className="text-foreground text-sm font-medium">{row.value}</span>
            </div>
          ))}
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 mt-2">
            <p className="text-muted-foreground text-xs">
              모든 랭킹은 KST 기준 주차 설정에 따라 집계됩니다. GitHub commit timestamp는 서버에서 KST 기준 구간으로 변환하여 처리됩니다.
            </p>
          </div>
        </div>
      </Card>

      {/* Rate Limit */}
      <Card className="rounded-xl gap-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <CardTitle className="text-sm font-semibold">GitHub API Rate Limit</CardTitle>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground text-sm">남은 요청</span>
            <span className="text-foreground text-sm font-medium">
              {config.githubRateLimit.remaining.toLocaleString()} / {config.githubRateLimit.total.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", rateColor)} style={{ width: `${ratePercent}%` }} />
          </div>
          <div className="flex justify-between text-muted-foreground text-[10px] mt-1.5">
            <span>{ratePercent}% 남음</span>
            <span>리셋: 1시간 후</span>
          </div>
        </div>
      </Card>

      {/* Sync Log */}
      <Card className="rounded-xl gap-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <CardTitle className="text-sm font-semibold">동기화 로그</CardTitle>
        </div>
        <div>
          {syncLogs.map((log, i) => {
            const sc = statusConfig[log.status];
            const StatusIcon = sc.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                <StatusIcon className={cn("size-3.5 shrink-0", sc.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm">{fmt(log.time)} KST</p>
                  <p className="text-muted-foreground text-[11px] flex gap-3 mt-0.5">
                    <span>커밋 {log.newCommits}개</span>
                    <span>Repo {log.repos}개</span>
                    <span>소요 {log.duration}</span>
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] font-semibold", sc.badgeClass)}>
                  {sc.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-muted-foreground text-xs">
          서버리스 환경에서는 실시간 업데이트 대신 주기적 동기화 방식으로 운영됩니다. 현재 데이터는 마지막 동기화 시점 기준입니다. GitHub 활동은 {config.syncInterval} 자동 반영됩니다.
        </p>
      </div>
    </div>
  );
}

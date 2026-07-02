import { CheckCircle2, Clock, AlertTriangle, RefreshCw } from "lucide-react"
import { syncStatus } from "@/lib/data"
import { cn } from "@/lib/utils"

const stateMap = {
  ok: { label: "정상", icon: CheckCircle2, cls: "text-positive bg-positive/15 border-positive/30" },
  delayed: { label: "지연", icon: Clock, cls: "text-gold bg-gold/15 border-gold/30" },
  failed: { label: "실패", icon: AlertTriangle, cls: "text-destructive bg-destructive/15 border-destructive/30" },
}

export function SyncStatusCard() {
  const s = stateMap[syncStatus.state]
  const rateLimitPct = Math.round((syncStatus.rateLimitUsed / syncStatus.rateLimitTotal) * 100)

  return (
    <section className="rounded-xl border border-border/70 bg-card/70 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <RefreshCw className="h-4 w-4 text-primary" />
          동기화 상태
        </h3>
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", s.cls)}>
          <s.icon className="h-3 w-3" />
          {s.label}
        </span>
      </div>

      <dl className="mt-3 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">마지막 동기화</dt>
          <dd className="font-medium tabular">{syncStatus.lastSync}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">다음 동기화 예정</dt>
          <dd className="font-medium tabular">{syncStatus.nextSync}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">집계 대상 repository</dt>
          <dd className="font-medium tabular">{syncStatus.reposTracked}개</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">반영된 새 커밋</dt>
          <dd className="font-medium tabular text-primary">+{syncStatus.commitsSinceLastSync}</dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-border/60 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">GitHub API rate limit</span>
          <span className="font-medium tabular">
            {syncStatus.rateLimitUsed.toLocaleString()} / {syncStatus.rateLimitTotal.toLocaleString()}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", rateLimitPct > 80 ? "bg-gold" : "bg-primary")}
            style={{ width: `${rateLimitPct}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        GitHub 활동은 1시간마다 자동 반영됩니다. 현재 데이터는 마지막 동기화 시점 기준입니다.
      </p>
    </section>
  )
}

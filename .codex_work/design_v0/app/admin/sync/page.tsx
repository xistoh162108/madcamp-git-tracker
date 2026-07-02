import type { Metadata } from "next"
import { RefreshCw, GitCommit, FolderGit2, Gauge, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { syncStatus, config, feed } from "@/lib/data"

export const metadata: Metadata = {
  title: "동기화 상태 · 몰입 랭킹",
}

const stateMap = {
  ok: { label: "정상", cls: "text-positive", dot: "bg-positive", icon: CheckCircle2 },
  delayed: { label: "지연", cls: "text-gold", dot: "bg-gold", icon: Clock },
  failed: { label: "실패", cls: "text-destructive", dot: "bg-destructive", icon: AlertTriangle },
} as const

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

export default function SyncPage() {
  const s = stateMap[syncStatus.state]
  const StateIcon = s.icon
  const ratePct = Math.round((syncStatus.rateLimitUsed / syncStatus.rateLimitTotal) * 100)
  const syncEvents = feed.filter((f) => f.kind === "sync" || f.kind === "commit").slice(0, 6)

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">동기화 상태</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            GitHub 활동 데이터의 수집 상태입니다. {config.syncInterval} 자동 동기화됩니다.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          지금 동기화
        </button>
      </div>

      <div className="mb-5 flex items-center justify-between rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className={["relative flex h-2.5 w-2.5 items-center justify-center"].join(" ")}>
            <span className={["absolute h-2.5 w-2.5 animate-ping rounded-full opacity-60", s.dot].join(" ")} />
            <span className={["h-2.5 w-2.5 rounded-full", s.dot].join(" ")} />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <StateIcon className={["h-4 w-4", s.cls].join(" ")} />
              <span className={["text-sm font-semibold", s.cls].join(" ")}>{s.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">마지막 동기화 {syncStatus.lastSync}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">다음 예정</p>
          <p className="font-mono text-sm font-medium text-foreground">{syncStatus.nextSync}</p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={FolderGit2} label="추적 repository" value={String(syncStatus.reposTracked)} sub="organization 기준" />
        <StatTile
          icon={GitCommit}
          label="신규 커밋"
          value={`+${syncStatus.commitsSinceLastSync}`}
          sub="마지막 동기화 이후"
        />
        <StatTile
          icon={Gauge}
          label="API Rate Limit"
          value={`${ratePct}%`}
          sub={`${syncStatus.rateLimitUsed.toLocaleString()} / ${syncStatus.rateLimitTotal.toLocaleString()}`}
        />
        <StatTile
          icon={AlertTriangle}
          label="실패한 repo"
          value={String(syncStatus.failedRepos.length)}
          sub={syncStatus.failedRepos.length === 0 ? "이상 없음" : "확인 필요"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-semibold text-foreground">API Rate Limit 사용량</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            GitHub REST API 시간당 한도 대비 현재 사용량입니다.
          </p>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
              {syncStatus.rateLimitUsed.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">/ {syncStatus.rateLimitTotal.toLocaleString()}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={[
                "h-full rounded-full transition-all",
                ratePct > 85 ? "bg-destructive" : ratePct > 60 ? "bg-gold" : "bg-positive",
              ].join(" ")}
              style={{ width: `${ratePct}%` }}
            />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            한도 초과가 예상되면 동기화 주기를 자동으로 늘려 안정적으로 데이터를 수집합니다.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">최근 동기화 로그</h2>
          <ul className="space-y-3">
            {syncEvents.map((e) => (
              <li key={e.id} className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <div className="min-w-0">
                  <p className="text-xs leading-relaxed text-foreground">{e.text}</p>
                  <p className="text-[11px] text-muted-foreground">{e.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  )
}

import path from "node:path"
import type { Metadata } from "next"
import { GitCommit, FolderGit2, Gauge, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import { AdminSessionBar } from "@/components/admin-session-bar"
import { AdminShell } from "@/components/admin-shell"
import { AdminSyncControls } from "@/components/admin-sync-controls"
import { syncStatus } from "@/lib/data"
import buildTimeSnapshot from "@/public/data/snapshots/seed.json"
import type { AggregatedSnapshot } from "@/src/aggregation/aggregate"
import { loadConfig } from "@/src/config/load-config"
import { readSnapshotFallback } from "@/src/snapshot/fallback"
import type { SyncReport } from "@/src/sync/sync-runner"

export const metadata: Metadata = {
  title: "동기화 상태 · 몰입 랭킹",
}

export const dynamic = "force-dynamic"

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
  const snapshot = readSnapshotFallback<AggregatedSnapshot>(
    path.join(process.cwd(), "public", "data", "snapshots", "latest.json"),
    buildTimeSnapshot as AggregatedSnapshot,
  )
  const config = loadConfig()
  const syncReport = readSnapshotFallback<SyncReport | null>(
    path.join(process.cwd(), "data", "sync-reports", "latest.json"),
    null,
  )
  const snapshotState =
    snapshot.sync?.status === "partial" ? "delayed" : snapshot.sync?.status === "failed" ? "failed" : syncStatus.state
  const s = stateMap[snapshotState]
  const StateIcon = s.icon
  const rateUsed = snapshot.sync?.rateLimit.used ?? syncStatus.rateLimitUsed
  const rateTotal = snapshot.sync?.rateLimit.limit ?? syncStatus.rateLimitTotal
  const ratePct = Math.round((rateUsed / Math.max(1, rateTotal)) * 100)
  const syncEvents = snapshot.activityFeed.slice(0, 6).map((item) => ({
    id: item.id,
    text: `${item.label} · ${item.repoName.replace(/^.*?(w\d+-c\d+-\d+)$/, "$1")} · ${item.summary}`,
    time: new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(item.committedAt)),
  }))

  return (
    <AdminShell displayName={config.displayName}>
      <AdminSessionBar />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">동기화 상태</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            GitHub 활동 데이터는 서버 cron이 5분마다 자동 수집합니다.
          </p>
        </div>
      </div>

      <AdminSyncControls currentWeek={snapshot.currentWeek ?? null} />

      {syncReport ? <SyncIntegrityCard report={syncReport} /> : null}

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
            <p className="text-xs text-muted-foreground">마지막 동기화 {snapshot.generatedAtKst}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">다음 예정</p>
          <p className="font-mono text-sm font-medium text-foreground">{syncStatus.nextSync}</p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={FolderGit2}
          label="추적 repository"
          value={String(snapshot.sync?.reposScanned ?? snapshot.summary.activeRepos)}
          sub="organization 기준"
        />
        <StatTile
          icon={GitCommit}
          label="신규 커밋"
          value={`+${snapshot.sync?.commitsProcessed ?? snapshot.summary.totalCommits}`}
          sub="마지막 동기화 이후"
        />
        <StatTile
          icon={Gauge}
          label="API Rate Limit"
          value={`${ratePct}%`}
          sub={`${rateUsed.toLocaleString()} / ${rateTotal.toLocaleString()}`}
        />
        <StatTile
          icon={AlertTriangle}
          label="실패한 repo"
          value={String(snapshot.sync?.failedRepos.length ?? syncStatus.failedRepos.length)}
          sub={(snapshot.sync?.failedRepos.length ?? syncStatus.failedRepos.length) === 0 ? "이상 없음" : "확인 필요"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-semibold text-foreground">API Rate Limit 사용량</h2>
          <p className="mb-4 text-xs text-muted-foreground">GitHub REST API 시간당 한도 대비 현재 사용량입니다.</p>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
              {rateUsed.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">/ {rateTotal.toLocaleString()}</span>
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
            동기화는 5분 간격으로 고정 실행됩니다. 한도 사용량이 높아지면 수집 범위나 토큰 권한을 점검하세요.
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

function SyncIntegrityCard({ report }: { report: SyncReport }) {
  const attribution = report.attribution ?? {
    participantCommits: 0,
    coAuthoredParticipantCommits: 0,
    botWithParticipant: 0,
    botOnly: 0,
    unknown: report.unknownAuthors,
  }
  const statusClass =
    report.status === "success"
      ? "text-positive"
      : report.status === "partial_success"
        ? "text-gold"
        : "text-destructive"

  return (
    <section className="mb-5 rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">동기화 무결성</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            commit ledger와 sync report 기준으로 누락 가능성을 확인합니다.
          </p>
        </div>
        <span className={["text-xs font-semibold", statusClass].join(" ")}>{report.status}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IntegrityMetric label="조회 성공 repo" value={`${report.reposSucceeded} / ${report.reposExpected}`} />
        <IntegrityMetric label="실패 repo" value={String(report.reposFailed)} />
        <IntegrityMetric label="고유 commit" value={report.uniqueCommits.toLocaleString()} />
        <IntegrityMetric label="unknown author" value={String(report.unknownAuthors)} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IntegrityMetric label="참가자 매칭 commit" value={String(attribution.participantCommits)} />
        <IntegrityMetric label="공동 작성 매칭" value={String(attribution.coAuthoredParticipantCommits)} />
        <IntegrityMetric label="bot + 참가자" value={String(attribution.botWithParticipant)} />
        <IntegrityMetric label="bot only" value={String(attribution.botOnly)} />
      </div>
      {report.failedRepos.length ? (
        <ul className="mt-4 space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          {report.failedRepos.slice(0, 5).map((repo) => (
            <li key={repo.repoName} className="text-xs text-destructive">
              {repo.repoName}: {repo.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function IntegrityMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}

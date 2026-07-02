"use client"

import { useState } from "react"
import { GitBranch, Play, Radar, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type ActionResult = {
  title: string
  ok: boolean
  body: unknown
}

export function AdminSyncControls({ currentWeek }: { currentWeek: number | null }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<ActionResult | null>(null)

  async function call(title: string, key: string, path: string, init?: RequestInit) {
    setLoading(key)
    setResult(null)
    const response = await fetch(path, init)
    const body = await response.json().catch(() => ({}))
    setLoading(null)
    setResult({ title, ok: response.ok, body })
  }

  return (
    <section className="mb-5 rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">관리자 동기화 제어</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            자동 동기화는 10분마다 실행되고, 이 버튼들은 관리자 세션에서만 사용할 수 있습니다.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="gap-1.5 bg-transparent"
          onClick={() => call("Rate limit", "rate", "/api/admin/rate-limit")}
          disabled={Boolean(loading)}
        >
          <Radar className="h-4 w-4" />
          Rate limit
        </Button>
        <Button
          variant="outline"
          className="gap-1.5 bg-transparent"
          onClick={() => call("Repository discovery", "discovery", "/api/admin/discovery")}
          disabled={Boolean(loading)}
        >
          <GitBranch className="h-4 w-4" />
          Discovery
        </Button>
        <Button
          variant="outline"
          className="gap-1.5 bg-transparent"
          onClick={() =>
            call("Dry-run sync", "dry", "/api/admin/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dryRun: true, week: currentWeek ?? undefined }),
            })
          }
          disabled={Boolean(loading)}
        >
          <Play className="h-4 w-4" />
          Dry-run
        </Button>
        <Button
          className="gap-1.5"
          onClick={() =>
            call("GitHub sync", "sync", "/api/admin/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ week: currentWeek ?? undefined }),
            })
          }
          disabled={Boolean(loading)}
        >
          <RefreshCw className={loading === "sync" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          현재 주차 동기화
        </Button>
      </div>
      {result ? (
        <div className="mt-4 rounded-lg border border-border bg-background/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-foreground">{result.title}</p>
            <span className={result.ok ? "text-xs text-positive" : "text-xs text-destructive"}>
              {result.ok ? "성공" : "실패"}
            </span>
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
            {JSON.stringify(result.body, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  )
}

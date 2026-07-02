"use client"

import { useState } from "react"
import { LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AdminLoginForm({ nextPath = "/admin" }: { nextPath?: string }) {
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, next: nextPath }),
    })
    const payload = (await response.json().catch(() => ({}))) as { next?: string; error?: string }

    setLoading(false)
    if (!response.ok) {
      setError(payload.error ?? "관리자 토큰을 확인하세요.")
      return
    }
    window.location.href = payload.next ?? "/admin"
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-lg bg-primary/15 p-2 text-primary">
          <LockKeyhole className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-base font-semibold text-foreground">관리자 로그인</h1>
          <p className="text-xs text-muted-foreground">ADMIN_TOKEN으로 보호됩니다.</p>
        </div>
      </div>
      <Input
        autoFocus
        type="password"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder="ADMIN_TOKEN"
        autoComplete="current-password"
      />
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <Button className="mt-4 w-full" disabled={loading || !token.trim()}>
        {loading ? "확인 중" : "로그인"}
      </Button>
    </form>
  )
}

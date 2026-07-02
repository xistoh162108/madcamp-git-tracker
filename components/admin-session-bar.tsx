"use client"

import { useState } from "react"
import { LogOut, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AdminSessionBar() {
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => null)
    window.location.href = "/admin/login"
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-positive/25 bg-positive/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-foreground">
        <ShieldCheck className="h-4 w-4 text-positive" />
        <span>관리자 세션 활성화</span>
      </div>
      <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-transparent" onClick={logout} disabled={loading}>
        <LogOut className="h-3.5 w-3.5" />
        로그아웃
      </Button>
    </div>
  )
}

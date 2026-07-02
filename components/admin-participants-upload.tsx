"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type UploadResult = {
  valid?: boolean
  saved?: boolean
  participants?: Array<{ name: string; githubUsername: string; class?: number }>
  warnings?: string[]
  error?: string
}

export function AdminParticipantsUpload() {
  const [csv, setCsv] = useState("name,identifier,class\n")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)

  async function upload() {
    setLoading(true)
    setResult(null)
    const response = await fetch("/api/admin/upload-participants", {
      method: "POST",
      headers: { "Content-Type": "text/csv; charset=utf-8" },
      body: csv,
    })
    const payload = (await response.json().catch(() => ({}))) as UploadResult
    setLoading(false)
    setResult(payload)
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={csv}
        onChange={(event) => setCsv(event.target.value)}
        className="min-h-48 font-mono text-xs"
        spellCheck={false}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={upload} disabled={loading || !csv.trim()} className="gap-1.5">
          <Upload className="h-4 w-4" />
          {loading ? "저장 중" : "참가자 CSV 저장"}
        </Button>
        {result?.saved ? (
          <p className="text-xs text-positive">{result.participants?.length ?? 0}명이 저장되었습니다.</p>
        ) : result?.error ? (
          <p className="text-xs text-destructive">{result.error}</p>
        ) : null}
      </div>
      {result?.warnings?.length ? (
        <ul className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

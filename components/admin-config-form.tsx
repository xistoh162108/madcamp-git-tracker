"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { AppConfig } from "@/src/config/schema"

type Status = { type: "idle" | "ok" | "error"; text: string }

export function AdminConfigForm({ initialConfig }: { initialConfig: AppConfig }) {
  const [form, setForm] = useState(initialConfig)
  const [status, setStatus] = useState<Status>({ type: "idle", text: "" })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setStatus({ type: "idle", text: "" })

    const response = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const payload = (await response.json().catch(() => ({}))) as { config?: AppConfig; error?: unknown }

    setSaving(false)
    if (!response.ok || !payload.config) {
      setStatus({ type: "error", text: formatError(payload.error) })
      return
    }
    setForm(payload.config)
    setStatus({ type: "ok", text: "설정이 저장되었습니다." })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="시즌 ID">
          <Input value={form.season} onChange={(event) => setForm({ ...form, season: event.target.value })} />
        </Field>
        <Field label="표시 이름">
          <Input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
        </Field>
        <Field label="GitHub Organization">
          <Input value={form.githubOrg} onChange={(event) => setForm({ ...form, githubOrg: event.target.value })} />
        </Field>
        <Field label="Repository 패턴">
          <Input
            value={form.repoNamePattern}
            onChange={(event) => setForm({ ...form, repoNamePattern: event.target.value })}
          />
        </Field>
        <Field label="분반 수">
          <Input
            type="number"
            min={1}
            value={form.classCount}
            onChange={(event) => setForm({ ...form, classCount: Number(event.target.value) })}
          />
        </Field>
        <Field label="현재 주차 Override">
          <Input
            type="number"
            min={1}
            value={form.currentWeekOverride ?? ""}
            placeholder="자동 판별"
            onChange={(event) =>
              setForm({
                ...form,
                currentWeekOverride: event.target.value ? Number(event.target.value) : undefined,
              })
            }
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <Label className="text-xs text-muted-foreground">분반 랭킹 기본 집계</Label>
          <Select
            value={form.ranking.defaultClassMetric}
            onValueChange={(value: "averagePerPerson" | "total") =>
              setForm({ ...form, ranking: { ...form.ranking, defaultClassMetric: value } })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="averagePerPerson">인당 평균</SelectItem>
              <SelectItem value="total">전체 합계</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field label="오늘의 활동 집계 시간">
          <Input
            type="number"
            min={1}
            value={form.ranking.dailyWindowHours}
            onChange={(event) =>
              setForm({
                ...form,
                ranking: { ...form.ranking, dailyWindowHours: Number(event.target.value) },
              })
            }
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SwitchRow
          label="오늘의 활동 표시"
          desc="최근 활동 하이라이트 카드를 표시합니다."
          checked={form.ranking.showDailyHighlights}
          onCheckedChange={(showDailyHighlights) =>
            setForm({ ...form, ranking: { ...form.ranking, showDailyHighlights } })
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? "저장 중" : "설정 저장"}
        </Button>
        {status.text ? (
          <p className={status.type === "error" ? "text-xs text-destructive" : "text-xs text-positive"}>
            {status.text}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function SwitchRow({
  label,
  desc,
  checked,
  onCheckedChange,
}: {
  label: string
  desc: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function formatError(error: unknown) {
  if (!error) return "저장에 실패했습니다."
  if (typeof error === "string") return error
  return "설정 값이 유효하지 않습니다. 주차 겹침과 필수 값을 확인하세요."
}

"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { weeks as initialWeeks, type WeekConfig, type WeekStatus } from "@/lib/data"
import { cn } from "@/lib/utils"

const statusMap: Record<WeekStatus, { label: string; cls: string }> = {
  upcoming: { label: "예정", cls: "text-muted-foreground bg-muted/50 border-border" },
  active: { label: "진행 중", cls: "text-positive bg-positive/15 border-positive/30" },
  ended: { label: "종료", cls: "text-foreground/70 bg-card border-border" },
}

function splitIso(iso: string) {
  const m = iso.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  return { date: m?.[1] ?? "", time: m?.[2] ?? "" }
}

function fmtDisplay(iso: string) {
  const { date, time } = splitIso(iso)
  return `${date.slice(5).replace("-", ".")} ${time}`
}

export function WeekSettings() {
  const [weeks, setWeeks] = useState<WeekConfig[]>(initialWeeks)

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">주차</th>
            <th className="px-3 py-2 font-medium">표시 이름</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">시작 일시</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">종료 일시</th>
            <th className="px-3 py-2 font-medium">상태</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">집계</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => {
            const s = statusMap[w.status]
            return (
              <tr key={w.week} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2.5 font-mono tabular">W{w.week}</td>
                <td className="px-3 py-2.5 font-medium">{w.label}</td>
                <td className="hidden px-3 py-2.5 font-mono text-xs text-muted-foreground sm:table-cell">
                  {fmtDisplay(w.startAt)}
                  <span className="ml-1 text-[10px] text-primary">KST</span>
                </td>
                <td className="hidden px-3 py-2.5 font-mono text-xs text-muted-foreground sm:table-cell">
                  {fmtDisplay(w.endAt)}
                  <span className="ml-1 text-[10px] text-primary">KST</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium", s.cls)}>
                    {s.label}
                  </span>
                </td>
                <td className="hidden px-3 py-2.5 md:table-cell">
                  <span className={cn("text-xs", w.enabled ? "text-positive" : "text-muted-foreground")}>
                    {w.enabled ? "포함" : "제외"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <WeekEditDialog
                    week={w}
                    onSave={(updated) => setWeeks((prev) => prev.map((x) => (x.week === updated.week ? updated : x)))}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function WeekEditDialog({ week, onSave }: { week: WeekConfig; onSave: (w: WeekConfig) => void }) {
  const start = splitIso(week.startAt)
  const end = splitIso(week.endAt)
  const [form, setForm] = useState({
    label: week.label,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    timezone: "Asia/Seoul",
    enabled: week.enabled,
  })

  const save = () => {
    onSave({
      ...week,
      label: form.label,
      startAt: `${form.startDate}T${form.startTime}:00+09:00`,
      endAt: `${form.endDate}T${form.endTime}:59+09:00`,
      enabled: form.enabled,
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 bg-transparent px-2 text-xs">
          <Pencil className="h-3 w-3" /> 수정
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{week.label} 설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="주차 번호">
            <Input value={`W${week.week}`} disabled className="bg-muted/40" />
          </Field>
          <Field label="표시 이름">
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="시작 날짜">
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="시작 시간 (KST)">
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="종료 날짜">
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
            <Field label="종료 시간 (KST)">
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </Field>
          </div>
          <Field label="시간대">
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
            <div>
              <Label className="text-sm">집계 포함 여부</Label>
              <p className="text-[11px] text-muted-foreground">랭킹 집계에 이 주차를 포함합니다.</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="bg-transparent">
              취소
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={save}>저장</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

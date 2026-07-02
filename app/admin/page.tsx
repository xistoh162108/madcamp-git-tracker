import type { Metadata } from "next"
import { AdminConfigForm } from "@/components/admin-config-form"
import { AdminParticipantsUpload } from "@/components/admin-participants-upload"
import { AdminSessionBar } from "@/components/admin-session-bar"
import { AdminShell } from "@/components/admin-shell"
import { WeekSettings } from "@/components/week-settings"
import { loadConfig } from "@/src/config/load-config"
import { resolveCurrentWeek, type WeekConfig } from "@/src/config/schema"

export const metadata: Metadata = {
  title: "운영 설정 · 몰입 랭킹",
}

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {desc ? <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p> : null}
      </div>
      {children}
    </section>
  )
}

export default function AdminPage() {
  const config = loadConfig()
  const currentWeek = resolveCurrentWeek(config)
  const weekSettings = config.weeks.map((week) => ({ ...week, status: statusForWeek(week) }))

  return (
    <AdminShell displayName={config.displayName}>
      <AdminSessionBar />
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">운영 설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          시즌, 주차, 참가자 CSV, 랭킹 노출 규칙을 관리합니다. 모든 변경은 서버 설정 파일에 저장됩니다.
        </p>
      </div>

      <div className="grid gap-5">
        <SectionCard title="시즌과 랭킹 설정" desc={`현재 주차: ${currentWeek ? `${currentWeek}주차` : "기간 외"}`}>
          <AdminConfigForm initialConfig={config} />
        </SectionCard>

        <SectionCard title="주차 설정" desc="주차별 집계 구간과 활성화 여부를 관리합니다.">
          <WeekSettings initialWeeks={weekSettings} />
        </SectionCard>

        <SectionCard
          title="참가자 CSV"
          desc="저장된 CSV는 GitHub commit author 매핑에 사용됩니다. 필수 컬럼은 name, identifier입니다. identifier에는 GitHub ID 또는 commit email을 입력합니다."
        >
          <AdminParticipantsUpload />
        </SectionCard>
      </div>
    </AdminShell>
  )
}

function statusForWeek(week: WeekConfig): "upcoming" | "active" | "ended" {
  const now = Date.now()
  if (now < Date.parse(week.startAt)) return "upcoming"
  if (now > Date.parse(week.endAt)) return "ended"
  return "active"
}

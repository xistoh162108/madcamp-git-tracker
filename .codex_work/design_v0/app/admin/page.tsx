import type { Metadata } from "next"
import { AdminShell } from "@/components/admin-shell"
import { WeekSettings } from "@/components/week-settings"
import { config } from "@/lib/data"

export const metadata: Metadata = {
  title: "운영 설정 · 몰입 랭킹",
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground">{value}</div>
      {hint ? <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Toggle({ label, on, desc }: { label: string; on: boolean; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <span
        className={[
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          on ? "bg-primary" : "bg-muted",
        ].join(" ")}
        role="img"
        aria-label={on ? "활성화됨" : "비활성화됨"}
      >
        <span
          className={[
            "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
            on ? "translate-x-4" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
    </div>
  )
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
  return (
    <AdminShell>
      <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">운영 설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            시즌, 주차, 랭킹 노출 규칙을 관리합니다. 모든 시간 기준은 KST(Asia/Seoul)입니다.
          </p>
        </div>

        <div className="grid gap-5">
          <SectionCard title="시즌 정보" desc="현재 진행 중인 캠프 시즌의 기본 정보입니다.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="시즌" value={config.displayName} />
              <Field label="GitHub Organization" value={config.githubOrg} />
              <Field label="기간" value={`${config.startDate} ~ ${config.endDate}`} />
              <Field label="시간대" value={config.timezone} />
              <Field label="현재 주차" value={`${config.currentWeek}주차`} />
              <Field label="동기화 주기" value={config.syncInterval} />
            </div>
          </SectionCard>

          <SectionCard
            title="Repository 규칙"
            desc="동기화 대상 repository 를 식별하는 네이밍 규칙입니다."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="네이밍 패턴"
                value={config.repoNamePattern}
                hint="이 패턴과 일치하는 organization repository 가 자동으로 추적됩니다."
              />
              <Field label="분반" value={config.classes.join(" · ")} />
            </div>
          </SectionCard>

          <SectionCard title="주차 설정" desc="주차별 집계 구간과 활성화 여부를 관리합니다.">
            <WeekSettings />
          </SectionCard>

          <SectionCard title="랭킹 노출 규칙" desc="참가자에게 공개되는 랭킹 종류와 표시 옵션입니다.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="개인 랭킹" on={config.rankingVisibility.individual} desc="개인별 활동 랭킹 공개" />
              <Toggle label="팀 랭킹" on={config.rankingVisibility.team} desc="repository 단위 팀 랭킹 공개" />
              <Toggle label="분반 랭킹" on={config.rankingVisibility.class} desc="분반 단위 랭킹 공개" />
              <Toggle label="배지 시스템" on={config.badgesEnabled} desc="활동 기반 배지 부여 및 표시" />
              <Toggle label="오늘의 활동" on={config.showDailyHighlights} desc="최근 24시간 하이라이트 표시" />
              <Toggle label="마지막 동기화 표시" on={config.showLastSync} desc="동기화 시각을 참가자에게 노출" />
            </div>
            <p className="mt-4 rounded-lg bg-secondary/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              분반 랭킹 기본 집계 방식:{" "}
              <span className="font-medium text-foreground">
                {config.defaultClassRankingMetric === "averagePerPerson" ? "인당 평균" : "전체 합계"}
              </span>{" "}
              — 인원 차이를 보정하기 위해 인당 평균을 권장합니다.
            </p>
          </SectionCard>
        </div>
      </AdminShell>
  )
}

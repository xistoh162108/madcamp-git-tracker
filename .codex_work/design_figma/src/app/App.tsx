import { useState } from "react";
import { ArrowLeft, Settings, RefreshCw } from "lucide-react";
import { TopNav } from "./components/TopNav";
import { WeekSelector } from "./components/WeekSelector";
import { MetricCards } from "./components/MetricCards";
import { LeaderboardTable } from "./components/LeaderboardTable";
import { RightPanel } from "./components/RightPanel";
import { ContributionHeatmap } from "./components/ContributionHeatmap";
import { ActivityCharts } from "./components/ActivityCharts";
import { TeamDetail } from "./components/TeamDetail";
import { ParticipantDetail } from "./components/ParticipantDetail";
import { AdminSettings } from "./components/AdminSettings";
import { AdminSync } from "./components/AdminSync";
import { Button } from "./components/ui/button";
import { Separator } from "./components/ui/separator";
import { cn } from "./components/ui/utils";

type View = "dashboard" | "team-detail" | "participant-detail" | "admin" | "admin-sync";
type LeaderTab = "individual" | "team" | "class";
type ClassMetric = "average" | "total";

function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h1 className="text-foreground font-bold text-lg">{title}</h1>
      {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function AdminTabs({ active, onNav }: { active: View; onNav: (v: View) => void }) {
  return (
    <div className="flex gap-0.5 rounded-xl border border-border bg-muted p-0.5">
      <Button
        variant={active === "admin" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onNav("admin")}
        className="text-xs gap-1.5"
      >
        <Settings className="size-3.5" /> 설정
      </Button>
      <Button
        variant={active === "admin-sync" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onNav("admin-sync")}
        className="text-xs gap-1.5"
      >
        <RefreshCw className="size-3.5" /> 동기화 상태
      </Button>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [leaderTab, setLeaderTab] = useState<LeaderTab>("individual");
  const [selectedWeek, setSelectedWeek] = useState<number | "all">(2);
  const [selectedClass, setSelectedClass] = useState("all");
  const [classMetric, setClassMetric] = useState<ClassMetric>("average");
  const [selectedTeamRepo, setSelectedTeamRepo] = useState<string | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  const handleSelectTeam = (repo: string) => { setSelectedTeamRepo(repo); setView("team-detail"); };
  const handleSelectParticipant = (id: string) => { setSelectedParticipantId(id); setView("participant-detail"); };
  const navigate = (v: View) => setView(v);

  return (
    <div
      className="dark min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'Pretendard Variable', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}
    >
      <TopNav currentView={view} onNavigate={navigate} />

      <main className="mx-auto max-w-screen-xl px-4 py-5">

        {/* ── DASHBOARD ── */}
        {view === "dashboard" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <h1 className="text-foreground font-bold text-base">이번 주 몰입 현황</h1>
                <p className="text-muted-foreground text-xs mt-0.5">모든 랭킹은 KST 기준 주차 설정에 따라 집계됩니다.</p>
              </div>
              <WeekSelector selected={selectedWeek} onSelect={setSelectedWeek} />
            </div>

            <MetricCards selectedWeek={selectedWeek} />

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
              <LeaderboardTable
                tab={leaderTab}
                selectedWeek={selectedWeek}
                selectedClass={selectedClass}
                classMetric={classMetric}
                onTabChange={setLeaderTab}
                onClassMetricChange={setClassMetric}
                onSelectParticipant={handleSelectParticipant}
                onSelectTeam={handleSelectTeam}
                onFilterClassChange={setSelectedClass}
              />
              <RightPanel />
            </div>

            <ContributionHeatmap />
            <ActivityCharts />

            <Separator />
            <p className="text-muted-foreground text-center text-xs">
              커밋 수는 GitHub 활동량을 보여주는 참고 지표입니다. 작은 커밋, 문서 정리, 기획, 디자인, 디버깅도 모두 중요한 기여입니다.
            </p>
          </div>
        )}

        {/* ── TEAM DETAIL ── */}
        {view === "team-detail" && selectedTeamRepo && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="size-3.5" /> 대시보드로 돌아가기
            </Button>
            <TeamDetail
              repo={selectedTeamRepo}
              onBack={() => setView("dashboard")}
              onSelectParticipant={handleSelectParticipant}
            />
          </div>
        )}

        {/* ── PARTICIPANT DETAIL ── */}
        {view === "participant-detail" && selectedParticipantId && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="size-3.5" /> 대시보드로 돌아가기
            </Button>
            <ParticipantDetail
              participantId={selectedParticipantId}
              onBack={() => setView("dashboard")}
              onSelectTeam={handleSelectTeam}
            />
          </div>
        )}

        {/* ── ADMIN SETTINGS ── */}
        {view === "admin" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <PageHeader title="관리자 설정" sub="캠프, 주차, GitHub, 랭킹 설정을 관리합니다." />
              <AdminTabs active={view} onNav={navigate} />
            </div>
            <AdminSettings />
          </div>
        )}

        {/* ── ADMIN SYNC ── */}
        {view === "admin-sync" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <PageHeader title="동기화 상태" sub="GitHub 데이터 수집 및 동기화 현황을 확인합니다." />
              <AdminTabs active={view} onNav={navigate} />
            </div>
            <AdminSync />
          </div>
        )}

      </main>

      <footer className="border-t border-border mt-8">
        <div className="mx-auto max-w-screen-xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-muted-foreground text-[11px]">
            <span>몰입 랭킹 · 2026 여름학기</span>
            <span>마지막 업데이트: 2026.07.12 18:30 KST</span>
            <span className="hidden sm:block">GitHub 활동은 1시간마다 자동 반영됩니다.</span>
            <span className="hidden md:block">현재 데이터는 마지막 동기화 시점 기준입니다.</span>
            <span className="ml-auto hidden sm:block">랭킹은 KST 기준 주차 설정에 따라 집계됩니다.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

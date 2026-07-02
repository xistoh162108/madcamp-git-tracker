import { useState } from "react";
import { Save, Plus, Edit2, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { Card, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { cn } from "./ui/utils";
import { config } from "../data/mockData";

type SectionId = "camp" | "weeks" | "github" | "ranking";

function SectionCard({
  id, title, activeSection, onToggle, children,
}: {
  id: SectionId; title: string; activeSection: SectionId | null;
  onToggle: (id: SectionId) => void; children: React.ReactNode;
}) {
  const isOpen = activeSection === id;
  return (
    <Card className="rounded-xl gap-0 overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/40 transition-colors"
      >
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="border-t border-border p-5">{children}</div>
      )}
    </Card>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-[10px]">{hint}</p>}
    </div>
  );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-sm font-normal text-muted-foreground cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const statusBadge: Record<string, string> = {
  ended: "border-border text-muted-foreground",
  active: "border-green-500/30 bg-green-500/10 text-green-400",
  upcoming: "border-primary/20 bg-primary/5 text-primary/60",
};
const statusLabel: Record<string, string> = { ended: "종료", active: "진행 중", upcoming: "예정" };

export function AdminSettings() {
  const [activeSection, setActiveSection] = useState<SectionId | null>("camp");
  const [saved, setSaved] = useState(false);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);

  const [camp, setCamp] = useState({
    displayName: config.displayName, season: config.season,
    startDate: "2026-07-02", endDate: "2026-08-02",
    currentWeek: String(config.currentWeek), classes: config.classes.join(", "),
    timezone: config.timezone,
  });

  const [github, setGithub] = useState({
    githubOrg: config.githubOrg, repoPrefix: "2026-summer",
    repoPattern: config.repoNamePattern, excludedRepos: "",
    excludedParticipants: "", adminAccounts: config.adminAccounts.join(", "),
  });

  const [ranking, setRanking] = useState({
    publicIndividual: config.rankingPublic.individual,
    publicTeam: config.rankingPublic.team,
    publicClass: config.rankingPublic.class,
    badgesEnabled: config.badgesEnabled,
    defaultMetric: config.defaultClassRankingMetric,
    showDailyHighlights: true,
  });

  const [weeks, setWeeks] = useState(config.weeks.map(w => ({ ...w })));

  const toggle = (id: SectionId) => setActiveSection(prev => prev === id ? null : id);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const fmtDt = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant={saved ? "outline" : "secondary"}
          size="sm"
          onClick={handleSave}
          className={cn(saved && "border-green-500/30 text-green-400")}
        >
          {saved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
          {saved ? "저장됨" : "저장"}
        </Button>
      </div>

      {/* Camp */}
      <SectionCard id="camp" title="캠프 설정" activeSection={activeSection} onToggle={toggle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="기수 이름">
            <Input value={camp.displayName} onChange={e => setCamp({ ...camp, displayName: e.target.value })} />
          </FieldRow>
          <FieldRow label="Season ID" hint="예: 2026-summer">
            <Input value={camp.season} onChange={e => setCamp({ ...camp, season: e.target.value })} />
          </FieldRow>
          <FieldRow label="캠프 시작일">
            <Input type="date" value={camp.startDate} onChange={e => setCamp({ ...camp, startDate: e.target.value })} />
          </FieldRow>
          <FieldRow label="캠프 종료일">
            <Input type="date" value={camp.endDate} onChange={e => setCamp({ ...camp, endDate: e.target.value })} />
          </FieldRow>
          <FieldRow label="현재 활성 주차">
            <Input value={camp.currentWeek} onChange={e => setCamp({ ...camp, currentWeek: e.target.value })} />
          </FieldRow>
          <FieldRow label="시간대" hint="기본값: Asia/Seoul (KST)">
            <Input value={camp.timezone} onChange={e => setCamp({ ...camp, timezone: e.target.value })} />
          </FieldRow>
          <div className="sm:col-span-2">
            <FieldRow label="분반 목록 (쉼표 구분)" hint="예: 1분반, 2분반, 3분반, 4분반">
              <Input value={camp.classes} onChange={e => setCamp({ ...camp, classes: e.target.value })} />
            </FieldRow>
          </div>
        </div>
      </SectionCard>

      {/* Weeks */}
      <SectionCard id="weeks" title="주차 설정" activeSection={activeSection} onToggle={toggle}>
        <p className="text-muted-foreground text-xs mb-4">
          주차 시작/종료 시각은 KST (Asia/Seoul) 기준으로 설정됩니다. 모든 랭킹 집계의 기준이 됩니다.
        </p>
        <div className="space-y-2">
          {weeks.map(w => {
            const isEditing = editingWeek === w.week;
            return (
              <div key={w.week} className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 flex items-center gap-2.5 min-w-0">
                    <span className="text-foreground text-sm font-medium shrink-0">{w.label}</span>
                    <Badge variant="outline" className={cn("text-[10px]", statusBadge[w.status])}>
                      {statusLabel[w.status]}
                    </Badge>
                    <span className="text-muted-foreground text-[11px] hidden sm:block">
                      {fmtDt(w.startAt)} ~ {fmtDt(w.endAt)} KST
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={w.enabled}
                      onCheckedChange={v => setWeeks(weeks.map(wk => wk.week === w.week ? { ...wk, enabled: v } : wk))}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingWeek(isEditing ? null : w.week)}
                      className="size-7"
                    >
                      {isEditing ? <X className="size-3.5" /> : <Edit2 className="size-3.5" />}
                    </Button>
                  </div>
                </div>

                {isEditing && (
                  <div className="border-t border-border p-4 bg-muted/20">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <FieldRow label="표시 이름">
                        <Input defaultValue={w.label} className="h-8 text-sm" />
                      </FieldRow>
                      <FieldRow label="시작 날짜">
                        <Input type="date" defaultValue={w.startAt.split("T")[0]} className="h-8 text-sm" />
                      </FieldRow>
                      <FieldRow label="시작 시각 (KST)">
                        <Input type="time" defaultValue="09:00" className="h-8 text-sm" />
                      </FieldRow>
                      <FieldRow label="종료 날짜">
                        <Input type="date" defaultValue={w.endAt.split("T")[0]} className="h-8 text-sm" />
                      </FieldRow>
                      <FieldRow label="종료 시각 (KST)">
                        <Input type="time" defaultValue="08:59" className="h-8 text-sm" />
                      </FieldRow>
                      <FieldRow label="시간대">
                        <Input value="Asia/Seoul" readOnly className="h-8 text-sm opacity-60" />
                      </FieldRow>
                      <FieldRow label="상태">
                        <select
                          defaultValue={w.status}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="upcoming">예정</option>
                          <option value="active">진행 중</option>
                          <option value="ended">종료</option>
                        </select>
                      </FieldRow>
                      <div className="flex items-end pb-1">
                        <SwitchRow
                          label="집계 포함"
                          checked={w.enabled}
                          onChange={v => setWeeks(weeks.map(wk => wk.week === w.week ? { ...wk, enabled: v } : wk))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <Button variant="outline" size="sm" onClick={() => setEditingWeek(null)} className="border-primary/30 text-primary hover:bg-primary/10">
                        <Check className="size-3.5" /> 적용
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <Button variant="ghost" className="w-full border border-dashed border-border text-muted-foreground hover:text-foreground justify-start gap-2">
            <Plus className="size-3.5" /> 주차 추가
          </Button>
        </div>
      </SectionCard>

      {/* GitHub */}
      <SectionCard id="github" title="GitHub 설정" activeSection={activeSection} onToggle={toggle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="GitHub Organization">
            <Input value={github.githubOrg} onChange={e => setGithub({ ...github, githubOrg: e.target.value })} />
          </FieldRow>
          <FieldRow label="Repository prefix">
            <Input value={github.repoPrefix} onChange={e => setGithub({ ...github, repoPrefix: e.target.value })} />
          </FieldRow>
          <div className="sm:col-span-2">
            <FieldRow label="Repository naming pattern" hint="{season}-w{week}-c{class}-{teamNumber}">
              <Input value={github.repoPattern} onChange={e => setGithub({ ...github, repoPattern: e.target.value })} />
            </FieldRow>
          </div>
          <div className="sm:col-span-2">
            <FieldRow label="제외 repository (줄바꿈 구분)">
              <Input value={github.excludedRepos} onChange={e => setGithub({ ...github, excludedRepos: e.target.value })} />
            </FieldRow>
          </div>
          <div className="sm:col-span-2">
            <FieldRow label="제외 참가자 (GitHub username, 쉼표 구분)">
              <Input value={github.excludedParticipants} onChange={e => setGithub({ ...github, excludedParticipants: e.target.value })} />
            </FieldRow>
          </div>
          <div className="sm:col-span-2">
            <FieldRow label="관리자 계정 (쉼표 구분)">
              <Input value={github.adminAccounts} onChange={e => setGithub({ ...github, adminAccounts: e.target.value })} />
            </FieldRow>
          </div>
        </div>
      </SectionCard>

      {/* Ranking */}
      <SectionCard id="ranking" title="랭킹 설정" activeSection={activeSection} onToggle={toggle}>
        <div className="space-y-2">
          <SwitchRow label="개인 랭킹 공개" checked={ranking.publicIndividual} onChange={v => setRanking({ ...ranking, publicIndividual: v })} />
          <SwitchRow label="팀 랭킹 공개" checked={ranking.publicTeam} onChange={v => setRanking({ ...ranking, publicTeam: v })} />
          <SwitchRow label="분반 랭킹 공개" checked={ranking.publicClass} onChange={v => setRanking({ ...ranking, publicClass: v })} />
          <SwitchRow label="오늘의 활동 위젯 공개" checked={ranking.showDailyHighlights} onChange={v => setRanking({ ...ranking, showDailyHighlights: v })} />
          <SwitchRow label="배지 기능 사용" checked={ranking.badgesEnabled} onChange={v => setRanking({ ...ranking, badgesEnabled: v })} />
          <Separator className="my-3" />
          <div>
            <p className="text-muted-foreground text-xs font-medium mb-2">분반 랭킹 기본 기준</p>
            <div className="flex gap-1.5">
              {[
                { value: "averagePerPerson", label: "인당 평균 (권장)" },
                { value: "total", label: "총합" },
              ].map(opt => (
                <Button
                  key={opt.value}
                  variant={ranking.defaultMetric === opt.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setRanking({ ...ranking, defaultMetric: opt.value as any })}
                  className={cn("text-xs", ranking.defaultMetric === opt.value && "border border-primary/30 text-primary")}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Config preview */}
      <Card className="rounded-xl gap-0">
        <div className="px-5 py-3.5 border-b border-border">
          <CardTitle className="text-sm font-semibold">설정 JSON 미리보기</CardTitle>
        </div>
        <pre className="p-5 overflow-x-auto text-muted-foreground text-[11px] leading-relaxed">
{`{
  "season": "${camp.season}",
  "displayName": "${camp.displayName}",
  "timezone": "${camp.timezone}",
  "githubOrg": "${github.githubOrg}",
  "currentWeek": ${camp.currentWeek},
  "ranking": {
    "defaultClassMetric": "${ranking.defaultMetric}",
    "showDailyHighlights": ${ranking.showDailyHighlights},
    "showBadges": ${ranking.badgesEnabled}
  }
}`}
        </pre>
      </Card>
    </div>
  );
}

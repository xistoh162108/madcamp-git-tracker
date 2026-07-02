import { useState } from "react";
import { Card, CardTitle } from "./ui/card";
import { campDailyActivity } from "../data/mockData";

function commitColor(commits: number, max: number): string {
  if (commits === 0) return "bg-muted";
  const r = commits / max;
  if (r < 0.15) return "bg-primary/20";
  if (r < 0.35) return "bg-primary/40";
  if (r < 0.55) return "bg-primary/60";
  if (r < 0.75) return "bg-primary/75";
  return "bg-primary/90";
}

interface TooltipData { date: string; commits: number; x: number; y: number }

const weekLabels = ["1주차", "2주차", "3주차", "4주차"];

export function ContributionHeatmap() {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const realData = campDailyActivity.filter(d => !d.future);
  const maxCommits = Math.max(...realData.map(d => d.commits), 1);

  const weekGroups: (typeof campDailyActivity)[] = [[], [], [], []];
  campDailyActivity.forEach(d => {
    const idx = d.week - 1;
    if (idx >= 0 && idx < 4) weekGroups[idx].push(d);
  });

  const totalCommits = realData.reduce((s, d) => s + d.commits, 0);

  return (
    <Card className="rounded-xl gap-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <CardTitle className="text-sm font-semibold">날짜별 GitHub 활동 흐름</CardTitle>
          <p className="text-muted-foreground text-[11px] mt-0.5">모든 시간은 KST 기준으로 집계됩니다.</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[10px]">적음</span>
          {["bg-muted", "bg-primary/20", "bg-primary/40", "bg-primary/75", "bg-primary/90"].map((c, i) => (
            <div key={i} className={`size-3 rounded-sm ${c}`} />
          ))}
          <span className="text-muted-foreground text-[10px]">많음</span>
        </div>
      </div>

      <div className="p-5">
        <div className="overflow-x-auto">
          <div className="flex gap-5 min-w-max">
            {weekGroups.map((days, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1">
                <span className="text-muted-foreground text-[10px] mb-1">{weekLabels[wIdx]}</span>
                <div className="flex gap-1">
                  {days.map(day => (
                    <div key={day.date} className="flex flex-col gap-1">
                      <div
                        className={`size-8 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-ring ${
                          day.future ? "bg-muted/30 opacity-30" : commitColor(day.commits, maxCommits)
                        }`}
                        onMouseEnter={e => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setTooltip({ date: day.date, commits: day.commits, x: r.left, y: r.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                      <span className="text-muted-foreground text-center text-[9px]">
                        {day.date.split(".")[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary bar */}
        <div className="mt-4 pt-3 border-t border-border flex items-center gap-3">
          <div className="flex-1 h-1 rounded-full bg-border overflow-hidden flex">
            {campDailyActivity.map((d, i) => {
              const w = (1 / campDailyActivity.length) * 100;
              const intensity = d.future ? 0 : (d.commits / maxCommits);
              return (
                <div
                  key={i}
                  style={{
                    width: `${w}%`,
                    backgroundColor: d.future ? "transparent" : `rgb(34 211 238 / ${intensity * 0.65 + 0.1})`,
                  }}
                />
              );
            })}
          </div>
          <span className="text-muted-foreground text-[11px] shrink-0">
            총 {totalCommits.toLocaleString()}개 커밋
          </span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-md border border-border bg-popover px-3 py-2 shadow-lg"
          style={{ top: tooltip.y - 56, left: tooltip.x - 16, fontSize: "12px" }}
        >
          <p className="text-muted-foreground text-[11px]">{tooltip.date} (KST)</p>
          <p className="text-foreground font-semibold text-sm">
            {tooltip.commits > 0 ? `${tooltip.commits}개 커밋` : "데이터 없음"}
          </p>
        </div>
      )}
    </Card>
  );
}

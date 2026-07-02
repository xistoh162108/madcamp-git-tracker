import { cn } from "@/lib/utils"
import { weekLabels } from "@/lib/data"

interface ContributionHeatmapProps {
  grid: number[][] // [7 rows(요일)][N cols(주)]
  className?: string
}

const heatClass = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"]

export function ContributionHeatmap({ grid, className }: ContributionHeatmapProps) {
  const cols = grid[0]?.length ?? 0
  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-2">
        {/* 요일 라벨 */}
        <div className="flex flex-col justify-between py-0.5 text-[10px] text-muted-foreground">
          {weekLabels.map((d) => (
            <span key={d} className="h-3 leading-3">
              {d}
            </span>
          ))}
        </div>
        {/* 그리드 (요일 x 주) */}
        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div
            className="grid grid-flow-col gap-1"
            style={{ gridTemplateRows: "repeat(7, 0.75rem)", gridAutoColumns: "0.75rem" }}
            role="img"
            aria-label="날짜별 GitHub 활동 강도 히트맵"
          >
            {Array.from({ length: cols }).map((_, c) =>
              grid.map((row, r) => (
                <span
                  key={`${r}-${c}`}
                  className={cn("h-3 w-3 rounded-[3px]", heatClass[row[c]])}
                  title={`활동 강도 ${row[c]}/4`}
                />
              )),
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          날짜별 GitHub 활동 흐름입니다. 모든 시간은 KST 기준으로 집계됩니다.
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>적음</span>
          {heatClass.map((c) => (
            <span key={c} className={cn("h-3 w-3 rounded-[3px]", c)} />
          ))}
          <span>많음</span>
        </div>
      </div>
    </div>
  )
}

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils";
import { config } from "../data/mockData";

interface WeekSelectorProps {
  selected: number | "all";
  onSelect: (w: number | "all") => void;
}

export function WeekSelector({ selected, onSelect }: WeekSelectorProps) {
  const fmtHM = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
      <Button
        variant={selected === "all" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onSelect("all")}
        className="shrink-0"
      >
        전체 기간
      </Button>

      {config.weeks.map((w) => {
        const isSelected = selected === w.week;
        const isUpcoming = w.status === "upcoming";

        return (
          <Button
            key={w.week}
            variant={isSelected ? "secondary" : "ghost"}
            size="sm"
            onClick={() => !isUpcoming && onSelect(w.week)}
            disabled={isUpcoming}
            className={cn("shrink-0 gap-1.5", isUpcoming && "opacity-40")}
          >
            <span>{w.label}</span>
            <span className="text-muted-foreground text-[10px] hidden sm:inline">
              {fmtHM(w.startAt)}~{fmtHM(w.endAt).split(" ")[1]}
            </span>
            {w.status === "active" && (
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            )}
          </Button>
        );
      })}
    </div>
  );
}

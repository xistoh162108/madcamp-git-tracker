import { RefreshCw, Settings, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils";
import { config } from "../data/mockData";

type View = string;

interface TopNavProps {
  onNavigate: (v: View) => void;
  currentView: View;
}

function SyncStatusBadge() {
  const d = new Date(config.lastSyncAt);
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const isNormal = config.syncStatus === "normal";

  return (
    <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground text-xs">
      {isNormal
        ? <CheckCircle className="size-3 text-green-500" />
        : <AlertCircle className="size-3 text-yellow-500" />}
      <span>업데이트 {hm} KST</span>
    </div>
  );
}

export function TopNav({ onNavigate, currentView }: TopNavProps) {
  const activeWeek = config.weeks.find((w) => w.status === "active");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="flex h-12 items-center gap-3">
          {/* Brand */}
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-2 shrink-0 text-sm"
          >
            <span className="text-foreground font-bold tracking-tight">몰입 랭킹</span>
            <span className="hidden sm:block text-muted-foreground text-xs">{config.displayName}</span>
          </button>

          <Separator orientation="vertical" className="hidden sm:block h-4" />

          {/* Current week indicator */}
          {activeWeek && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-muted-foreground text-xs">
                {activeWeek.label} · 진행 중
              </span>
            </div>
          )}

          <div className="flex-1" />

          <SyncStatusBadge />

          <Separator orientation="vertical" className="h-4" />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("admin-sync")}
              className={cn(currentView === "admin-sync" && "bg-accent text-foreground")}
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden md:inline">동기화</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("admin")}
              className={cn(currentView === "admin" && "bg-accent text-foreground")}
            >
              <Settings className="size-3.5" />
              <span className="hidden md:inline">관리자</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

import { GitCommit, TrendingUp, Star, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { activityFeed } from "../data/mockData";

function classColor(cls?: string) {
  if (!cls) return "text-gray-400";
  const map: Record<string, string> = {
    "1분반": "text-cyan-400",
    "2분반": "text-violet-400",
    "3분반": "text-lime-400",
    "4분반": "text-amber-400",
  };
  return map[cls] ?? "text-gray-400";
}

function classBg(cls?: string) {
  if (!cls) return "bg-gray-500/10";
  const map: Record<string, string> = {
    "1분반": "bg-cyan-500/10 border-cyan-500/20",
    "2분반": "bg-violet-500/10 border-violet-500/20",
    "3분반": "bg-lime-500/10 border-lime-500/20",
    "4분반": "bg-amber-500/10 border-amber-500/20",
  };
  return map[cls] ?? "bg-gray-500/10";
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "commit":
      return <GitCommit size={14} className="text-cyan-400 shrink-0 mt-0.5" />;
    case "milestone":
      return <Star size={14} className="text-amber-400 shrink-0 mt-0.5" />;
    case "rank-up":
      return <TrendingUp size={14} className="text-lime-400 shrink-0 mt-0.5" />;
    case "sync":
      return <RefreshCw size={14} className="text-gray-400 shrink-0 mt-0.5" />;
    default:
      return <GitCommit size={14} className="text-gray-400 shrink-0 mt-0.5" />;
  }
}

interface ActivityFeedProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function ActivityFeed({ collapsed, onToggle }: ActivityFeedProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;
  const toggle = onToggle ?? (() => setInternalCollapsed((v) => !v));

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0f1e] overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
          <span className="text-gray-200" style={{ fontWeight: 600, fontSize: "0.875rem" }}>
            최근 GitHub 활동
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown size={16} className="text-gray-500" />
        ) : (
          <ChevronUp size={16} className="text-gray-500" />
        )}
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4 flex flex-col gap-2 max-h-[420px] overflow-y-auto">
          <p className="text-gray-600 mb-1" style={{ fontSize: "0.7rem" }}>
            실제 커밋 메시지는 표시되지 않습니다. 활동 요약만 제공됩니다.
          </p>
          {activityFeed.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-2.5 rounded-lg border p-3 ${
                item.class ? classBg(item.class) : "bg-white/5 border-white/10"
              }`}
            >
              <ActivityIcon type={item.type} />
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 leading-snug" style={{ fontSize: "0.78rem" }}>
                  {item.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-600" style={{ fontSize: "0.68rem" }}>
                    {item.time}
                  </span>
                  {item.class && (
                    <span className={`${classColor(item.class)}`} style={{ fontSize: "0.68rem", fontWeight: 600 }}>
                      {item.class}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { RefreshCw, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { config } from "../data/mockData";

export function SyncStatusBar() {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const ymd = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `${ymd} ${hm}`;
  };

  const statusColor =
    config.syncStatus === "normal"
      ? "text-lime-400"
      : config.syncStatus === "delayed"
      ? "text-amber-400"
      : "text-red-400";

  const StatusIcon =
    config.syncStatus === "normal"
      ? CheckCircle
      : config.syncStatus === "delayed"
      ? Clock
      : AlertCircle;

  return (
    <div className="border-t border-white/5 bg-[#070c1b]/80">
      <div className="mx-auto max-w-screen-xl px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <StatusIcon size={12} className={statusColor} />
            <span className={statusColor}>
              {config.syncStatus === "normal" ? "동기화 정상" : config.syncStatus === "delayed" ? "동기화 지연" : "동기화 실패"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <RefreshCw size={11} />
            <span>마지막 업데이트: {formatTime(config.lastSyncAt)} KST</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Clock size={11} />
            <span>다음 동기화: {formatTime(config.nextSyncAt)} KST</span>
          </div>
          <div className="hidden md:block">
            <span>GitHub API: {config.githubRateLimit.remaining.toLocaleString()} / {config.githubRateLimit.total.toLocaleString()} 남음</span>
          </div>
          <div className="hidden md:block">
            <span>이번 동기화: {config.lastSyncCommits}개 커밋 반영</span>
          </div>
          <div className="ml-auto hidden sm:block text-gray-600">
            랭킹은 KST 기준 주차 설정에 따라 집계됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}

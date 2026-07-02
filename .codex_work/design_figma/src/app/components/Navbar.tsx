import { useState } from "react";
import { Github, Settings, RefreshCw, Menu, X, Trophy } from "lucide-react";

type View =
  | "dashboard"
  | "individual"
  | "team"
  | "class"
  | "team-detail"
  | "participant-detail"
  | "admin"
  | "admin-sync";

interface NavbarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const navItems = [
  { id: "dashboard" as View, label: "대시보드" },
  { id: "individual" as View, label: "개인 랭킹" },
  { id: "team" as View, label: "팀 랭킹" },
  { id: "class" as View, label: "분반 랭킹" },
];

export function Navbar({ currentView, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-cyan-500/20 bg-[#070c1b]/90 backdrop-blur-md">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-2 group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-500/30 group-hover:bg-cyan-500/30 transition-colors">
              <Trophy size={16} className="text-cyan-400" />
            </div>
            <span className="text-white hidden sm:block" style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
              몰입 랭킹
            </span>
            <span className="text-gray-500 hidden sm:block" style={{ fontSize: "0.75rem" }}>
              2026 여름학기
            </span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-2 rounded-lg transition-all text-sm ${
                  currentView === item.id ||
                  (item.id === "individual" && currentView === "participant-detail") ||
                  (item.id === "team" && currentView === "team-detail")
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("admin-sync")}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                currentView === "admin-sync"
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <RefreshCw size={14} />
              <span className="hidden lg:block">동기화</span>
            </button>
            <button
              onClick={() => onNavigate("admin")}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                currentView === "admin"
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <Settings size={14} />
              <span className="hidden lg:block">관리자</span>
            </button>
            <a
              href="https://github.com/madcamp-official"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all text-sm"
            >
              <Github size={14} />
            </a>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={`px-4 py-2.5 rounded-lg text-left text-sm transition-all ${
                  currentView === item.id
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="border-t border-white/10 mt-2 pt-2 flex gap-2">
              <button
                onClick={() => {
                  onNavigate("admin-sync");
                  setMobileOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-200 text-sm"
              >
                <RefreshCw size={14} />
                동기화 상태
              </button>
              <button
                onClick={() => {
                  onNavigate("admin");
                  setMobileOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-200 text-sm"
              >
                <Settings size={14} />
                관리자 설정
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

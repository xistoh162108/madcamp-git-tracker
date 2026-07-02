import { Crown, Github, ExternalLink } from "lucide-react";
import { participants, teams, classStats } from "../data/mockData";

type RankingType = "individual" | "team" | "class";

interface PodiumProps {
  rankingType: RankingType;
  onSelectParticipant?: (id: string) => void;
  onSelectTeam?: (repo: string) => void;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
        <Crown size={16} className="text-amber-400" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-400/20 border border-gray-400/40">
        <span className="text-gray-300" style={{ fontWeight: 700, fontSize: "0.8rem" }}>2</span>
      </div>
    );
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700/20 border border-amber-700/40">
      <span className="text-amber-600" style={{ fontWeight: 700, fontSize: "0.8rem" }}>3</span>
    </div>
  );
}

interface PodiumCardProps {
  rank: number;
  title: string;
  subtitle: string;
  stat: string;
  statLabel: string;
  extra?: string;
  isCenter?: boolean;
  onClick?: () => void;
  glowColor?: string;
}

function PodiumCard({ rank, title, subtitle, stat, statLabel, extra, isCenter, onClick, glowColor }: PodiumCardProps) {
  const heightClass = isCenter ? "pt-4" : "pt-8 mt-4";
  const borderColor =
    rank === 1
      ? "border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.1)]"
      : rank === 2
      ? "border-gray-400/30"
      : "border-amber-700/30";

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center ${heightClass} cursor-pointer w-full max-w-[160px] mx-auto group`}
    >
      <div
        className={`w-full rounded-xl border bg-[#0d1429] p-4 flex flex-col items-center gap-2 transition-all group-hover:bg-[#111d35] ${borderColor} ${
          isCenter ? "shadow-[0_0_30px_rgba(251,191,36,0.08)]" : ""
        }`}
      >
        <RankBadge rank={rank} />
        <div className="text-center">
          <div
            className="text-white"
            style={{ fontWeight: 700, fontSize: isCenter ? "1rem" : "0.875rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}
          >
            {title}
          </div>
          <div className="text-gray-500 mt-0.5" style={{ fontSize: "0.7rem" }}>
            {subtitle}
          </div>
        </div>
        <div className="text-center">
          <div
            className={`${isCenter ? "text-amber-400" : "text-cyan-400"}`}
            style={{ fontWeight: 700, fontSize: isCenter ? "1.5rem" : "1.25rem" }}
          >
            {stat}
          </div>
          <div className="text-gray-500" style={{ fontSize: "0.65rem" }}>
            {statLabel}
          </div>
        </div>
        {extra && (
          <div className="text-xs text-gray-500 text-center">{extra}</div>
        )}
      </div>
      {/* Podium base */}
      <div
        className={`w-full rounded-b-lg ${
          rank === 1
            ? "h-10 bg-gradient-to-b from-amber-500/20 to-amber-500/5 border-x border-b border-amber-400/20"
            : rank === 2
            ? "h-6 bg-gradient-to-b from-gray-400/10 to-transparent border-x border-b border-gray-400/20"
            : "h-4 bg-gradient-to-b from-amber-700/10 to-transparent border-x border-b border-amber-700/20"
        }`}
      />
    </button>
  );
}

export function Podium({ rankingType, onSelectParticipant, onSelectTeam }: PodiumProps) {
  const getIndividualCards = () => {
    const top3 = [...participants].sort((a, b) => a.rank - b.rank).slice(0, 3);
    return [
      {
        rank: 1,
        p: top3[0],
        title: top3[0].name,
        subtitle: `${top3[0].githubUsername} · ${top3[0].class}`,
        stat: top3[0].weeklyData[1]?.commits.toString() ?? "—",
        statLabel: "이번 주 커밋",
        extra: `전체 ${top3[0].totalCommits}개`,
        onClick: () => onSelectParticipant?.(top3[0].id),
      },
      {
        rank: 2,
        p: top3[1],
        title: top3[1].name,
        subtitle: `${top3[1].githubUsername} · ${top3[1].class}`,
        stat: top3[1].weeklyData[1]?.commits.toString() ?? "—",
        statLabel: "이번 주 커밋",
        extra: `전체 ${top3[1].totalCommits}개`,
        onClick: () => onSelectParticipant?.(top3[1].id),
      },
      {
        rank: 3,
        p: top3[2],
        title: top3[2].name,
        subtitle: `${top3[2].githubUsername} · ${top3[2].class}`,
        stat: top3[2].weeklyData[1]?.commits.toString() ?? "—",
        statLabel: "이번 주 커밋",
        extra: `전체 ${top3[2].totalCommits}개`,
        onClick: () => onSelectParticipant?.(top3[2].id),
      },
    ];
  };

  const getTeamCards = () => {
    const top3 = [...teams].sort((a, b) => a.rank - b.rank).slice(0, 3);
    return top3.map((t) => ({
      rank: t.rank,
      title: t.repo.split("2026-summer-")[1] ?? t.repo,
      subtitle: `${t.class} · ${t.memberIds.length}명`,
      stat: t.totalCommits.toString(),
      statLabel: "총 커밋",
      extra: `인당 평균 ${t.avgCommitsPerPerson.toFixed(1)}개`,
      onClick: () => onSelectTeam?.(t.repo),
    }));
  };

  const getClassCards = () => {
    const top3 = [...classStats].sort((a, b) => a.rank - b.rank).slice(0, 3);
    return top3.map((c) => ({
      rank: c.rank,
      title: c.class,
      subtitle: `${c.memberCount}명 · ${c.activeRepos}개 repo`,
      stat: c.avgCommitsPerPerson.toFixed(1),
      statLabel: "인당 평균 커밋",
      extra: `총 ${c.totalCommits}개`,
    }));
  };

  const cards =
    rankingType === "individual"
      ? getIndividualCards()
      : rankingType === "team"
      ? getTeamCards()
      : getClassCards();

  const order = [cards[1], cards[0], cards[2]];

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0f1e] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-gray-300" style={{ fontWeight: 600, fontSize: "0.875rem" }}>
          🏆 Top 3
        </h3>
        <span className="text-gray-600" style={{ fontSize: "0.7rem" }}>
          {rankingType === "individual" ? "개인" : rankingType === "team" ? "팀" : "분반"} · 이번 주 기준
        </span>
      </div>
      <div className="flex items-end justify-center gap-3">
        {order.map((card, i) => (
          <PodiumCard
            key={card.rank}
            rank={card.rank}
            title={card.title}
            subtitle={card.subtitle}
            stat={card.stat}
            statLabel={card.statLabel}
            extra={card.extra}
            isCenter={i === 1}
            onClick={card.onClick}
          />
        ))}
      </div>
    </div>
  );
}

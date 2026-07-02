import Link from "next/link"
import { Crown } from "lucide-react"
import { InitialsAvatar } from "@/components/initials-avatar"
import { cn } from "@/lib/utils"

export interface PodiumEntry {
  rank: number
  title: string
  subtitle: string
  value: string
  valueLabel: string
  href?: string
  mono?: boolean
}

const order = [1, 0, 2] // 2위, 1위, 3위 순으로 배치 (가운데가 1위)

const styles: Record<number, { ring: string; badge: string; height: string }> = {
  1: { ring: "ring-gold/50", badge: "bg-gold/15 text-gold border-gold/40", height: "sm:pt-2" },
  2: { ring: "ring-silver/40", badge: "bg-silver/15 text-silver border-silver/40", height: "sm:pt-8" },
  3: { ring: "ring-bronze/40", badge: "bg-bronze/15 text-bronze border-bronze/40", height: "sm:pt-8" },
}

export function Podium({ entries }: { entries: PodiumEntry[] }) {
  const top3 = entries.slice(0, 3)
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {order.map((idx) => {
        const e = top3[idx]
        if (!e) return <div key={idx} />
        const s = styles[e.rank]
        const inner = (
          <div
            className={cn(
              "flex h-full flex-col items-center rounded-xl border border-border/70 bg-card/70 p-3 text-center transition-colors hover:border-border",
              s.height,
              e.rank === 1 && "bg-gradient-to-b from-gold/[0.08] to-card/70",
            )}
          >
            <div className="relative">
              {e.rank === 1 && <Crown className="absolute -top-3.5 left-1/2 h-4 w-4 -translate-x-1/2 text-gold" />}
              <InitialsAvatar name={e.title} size={e.rank === 1 ? "lg" : "md"} className={cn("ring-2", s.ring)} />
            </div>
            <span className={cn("mt-2 inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-bold", s.badge)}>
              {e.rank}위
            </span>
            <p className={cn("mt-1.5 truncate text-sm font-semibold w-full", e.mono && "font-mono text-xs")}>{e.title}</p>
            <p className="truncate text-[11px] text-muted-foreground w-full">{e.subtitle}</p>
            <p className="mt-1 text-base font-bold tabular text-primary">{e.value}</p>
            <p className="text-[10px] text-muted-foreground">{e.valueLabel}</p>
          </div>
        )
        return e.href ? (
          <Link key={idx} href={e.href} className="block h-full">
            {inner}
          </Link>
        ) : (
          <div key={idx} className="h-full">
            {inner}
          </div>
        )
      })}
    </div>
  )
}

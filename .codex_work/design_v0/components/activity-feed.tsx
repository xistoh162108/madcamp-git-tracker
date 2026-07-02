import { GitCommitHorizontal, Flag, TrendingUp, RefreshCw } from "lucide-react"
import { feed } from "@/lib/data"

const kindMap = {
  commit: { icon: GitCommitHorizontal, cls: "text-primary bg-primary/10" },
  milestone: { icon: Flag, cls: "text-accent bg-accent/10" },
  rankup: { icon: TrendingUp, cls: "text-positive bg-positive/10" },
  sync: { icon: RefreshCw, cls: "text-muted-foreground bg-muted/40" },
}

export function ActivityFeed() {
  return (
    <section className="rounded-xl border border-border/70 bg-card/70 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">최근 GitHub 활동</h3>
        <span className="text-[11px] text-muted-foreground">요약형</span>
      </div>
      <ol className="mt-3 space-y-3">
        {feed.map((item) => {
          const k = kindMap[item.kind]
          return (
            <li key={item.id} className="flex gap-2.5">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${k.cls}`}>
                <k.icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed text-foreground/90 text-pretty">{item.text}</p>
                <span className="text-[11px] text-muted-foreground">{item.time}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface NoticeProps {
  children: React.ReactNode
  className?: string
}

export function Notice({ children, className }: NoticeProps) {
  return (
    <p className={cn("flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      <span className="text-pretty">{children}</span>
    </p>
  )
}

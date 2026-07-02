import { cn } from "@/lib/utils"

interface InitialsAvatarProps {
  name: string
  className?: string
  size?: "sm" | "md" | "lg"
}

const palette = [
  "bg-primary/15 text-primary",
  "bg-accent/20 text-accent",
  "bg-positive/15 text-positive",
  "bg-gold/15 text-gold",
  "bg-chart-5/20 text-chart-5",
]

function hash(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i)
  return Math.abs(h)
}

export function InitialsAvatar({ name, className, size = "md" }: InitialsAvatarProps) {
  const initials = name.slice(0, 2)
  const color = palette[hash(name) % palette.length]
  const sizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-1 ring-border/60",
        color,
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  )
}

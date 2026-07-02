"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface InitialsAvatarProps {
  name: string
  githubUsername?: string
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

const pixelSizes = { sm: 28, md: 36, lg: 48 }

function hash(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i)
  return Math.abs(h)
}

export function InitialsAvatar({ name, githubUsername, className, size = "md" }: InitialsAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const initials = name.slice(0, 2)
  const color = palette[hash(name) % palette.length]
  const sizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  }

  if (githubUsername && !imageFailed) {
    const pixels = pixelSizes[size]
    return (
      <img
        src={`https://github.com/${githubUsername}.png?size=${pixels * 2}`}
        alt={name}
        width={pixels}
        height={pixels}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={cn("inline-block shrink-0 rounded-full object-cover ring-1 ring-border/60", sizes[size], className)}
      />
    )
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

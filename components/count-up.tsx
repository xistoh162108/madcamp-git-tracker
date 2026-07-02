"use client"

import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  value: number
  durationMs?: number
  className?: string
  suffix?: string
}

export function CountUp({ value, durationMs = 1100, className, suffix }: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const visible = useRef(false)
  const displayRef = useRef(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    let cancelled = false
    const animateTo = (target: number) => {
      const from = displayRef.current
      const start = performance.now()
      const tick = (now: number) => {
        if (cancelled) return
        const t = Math.min(1, (now - start) / durationMs)
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3)
        const next = Math.round(from + (target - from) * eased)
        displayRef.current = next
        setDisplay(next)
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    if (visible.current) {
      animateTo(value)
      return () => {
        cancelled = true
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !visible.current) {
          visible.current = true
          animateTo(value)
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(node)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [value, durationMs])

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("ko-KR")}
      {suffix}
    </span>
  )
}

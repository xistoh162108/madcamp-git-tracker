"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function AutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), intervalMs)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [router, intervalMs])

  return null
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Matches the errors a tab left open across a deploy throws once the server has moved on to a
// new build: `router.refresh()` requests reference server actions / chunks that no longer exist,
// so the periodic refresh below fails forever and the page is stuck showing stale data.
const STALE_DEPLOYMENT_PATTERN = /Failed to find Server Action|ChunkLoadError|Loading chunk .* failed/i

function isStaleDeploymentError(message: string | undefined | null) {
  return !!message && STALE_DEPLOYMENT_PATTERN.test(message)
}

export function AutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isStaleDeploymentError(event.reason?.message)) window.location.reload()
    }
    const onError = (event: ErrorEvent) => {
      if (isStaleDeploymentError(event.message)) window.location.reload()
    }
    window.addEventListener("unhandledrejection", onRejection)
    window.addEventListener("error", onError)

    const interval = window.setInterval(() => router.refresh(), intervalMs)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("unhandledrejection", onRejection)
      window.removeEventListener("error", onError)
    }
  }, [router, intervalMs])

  return null
}

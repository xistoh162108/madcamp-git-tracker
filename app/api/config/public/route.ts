import { NextResponse } from "next/server"
import { loadConfig } from "@/src/config/load-config"
import { resolveCurrentWeek } from "@/src/config/schema"

export function GET() {
  const config = loadConfig()
  return NextResponse.json(
    {
      season: config.season,
      displayName: config.displayName,
      timezone: config.timezone,
      classCount: config.classCount,
      weeks: config.weeks,
      ranking: config.ranking,
      currentWeek: resolveCurrentWeek(config),
    },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  )
}

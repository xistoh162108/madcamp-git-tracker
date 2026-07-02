import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { isAdminAuthorized } from "@/src/auth/admin"
import { loadConfig } from "@/src/config/load-config"
import { AppConfigSchema, type AppConfig } from "@/src/config/schema"
import { writeConfig } from "@/src/config/write-config"

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  return NextResponse.json({ config: loadConfig() }, { headers: { "Cache-Control": "no-store" } })
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  try {
    const patch = (await request.json()) as Partial<AppConfig>
    const current = loadConfig()
    const next = AppConfigSchema.parse({
      ...current,
      ...patch,
      ranking: {
        ...current.ranking,
        ...(patch.ranking ?? {}),
      },
      weeks: patch.weeks ?? current.weeks,
    })

    return NextResponse.json({ ok: true, config: writeConfig(next) }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, error: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

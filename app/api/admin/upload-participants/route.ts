import fs from "node:fs"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { isAdminAuthorized } from "@/src/auth/admin"
import { parseParticipantsCsv } from "@/src/participants/parse-participants"

const maxCsvBytes = 512 * 1024
const participantsPath = path.join(process.cwd(), "src", "participants", "participants.csv")

function saveParticipantsCsv(csv: string) {
  fs.mkdirSync(path.dirname(participantsPath), { recursive: true })
  const tempPath = `${participantsPath}.${process.pid}.tmp`
  fs.writeFileSync(tempPath, csv)
  fs.renameSync(tempPath, participantsPath)
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const contentLength = Number(request.headers.get("content-length") ?? "0")
  if (contentLength > maxCsvBytes) return NextResponse.json({ error: "CSV is too large" }, { status: 413 })

  const csv = await request.text()
  if (new TextEncoder().encode(csv).byteLength > maxCsvBytes) {
    return NextResponse.json({ error: "CSV is too large" }, { status: 413 })
  }
  try {
    const result = parseParticipantsCsv(csv)
    saveParticipantsCsv(csv)
    return NextResponse.json(
      {
        valid: true,
        saved: true,
        path: "src/participants/participants.csv",
        participants: result.participants.map((participant) => ({
          participantId: participant.participantId,
          name: participant.name,
          githubUsername: participant.githubUsername,
          class: participant.class,
          aliases: participant.aliases,
        })),
        warnings: result.warnings,
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    )
  }
}

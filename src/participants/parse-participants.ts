import {
  ParticipantSchema,
  normalizeEmail,
  normalizeGithubUsername,
  githubUsernamePattern,
  type Participant,
} from "./participant-schema"

export interface ParticipantParseResult {
  participants: Participant[]
  warnings: string[]
}

const identifierHeaders = ["identifier", "github", "github_or_email", "github_username"]

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === "," && !quoted) {
      cells.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function parseParticipantsCsv(input: string): ParticipantParseResult {
  const warnings: string[] = []
  const normalized = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim()
  if (!normalized) throw new Error("participants CSV is empty")

  const rows = normalized.split("\n").filter((line) => line.trim().length > 0)
  const headers = parseCsvLine(rows[0]!).map((header) => header.trim())
  if (!headers.includes("name")) throw new Error("missing required column: name")
  const identifierHeader = identifierHeaders.find((header) => headers.includes(header))
  if (!identifierHeader) throw new Error("missing required column: identifier")
  for (const header of headers) {
    if (
      ![
        "participant_id",
        "name",
        "identifier",
        "github",
        "github_or_email",
        "github_username",
        "email",
        "class",
        "aliases",
      ].includes(header)
    ) {
      warnings.push(`unknown column ignored: ${header}`)
    }
  }

  const seen = new Set<string>()
  const seenNames = new Set<string>()
  const participants = rows.slice(1).map((line, index) => {
    const values = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((header, cellIndex) => [header, values[cellIndex] ?? ""]))
    const name = row.name.trim()
    if (!name) throw new Error(`row ${index + 2}: name is required`)

    const identifier = parseIdentifier(row[identifierHeader] || row.email || "")
    if (!identifier.value) throw new Error(`row ${index + 2}: identifier is required`)
    if (seen.has(identifier.value)) throw new Error(`duplicate identifier: ${identifier.value}`)
    seen.add(identifier.value)

    const normalizedName = name.toLowerCase()
    if (seenNames.has(normalizedName)) warnings.push(`duplicate name: ${name}`)
    seenNames.add(normalizedName)

    const participant = ParticipantSchema.parse({
      participantId: row.participant_id || `${slugify(name)}-${identifier.value}`,
      name,
      identifier: identifier.value,
      identifierType: identifier.type,
      githubUsername: identifier.type === "github" ? identifier.value : undefined,
      email: identifier.type === "email" ? identifier.value : row.email ? normalizeEmail(row.email) : undefined,
      class: row.class ? Number(row.class) : undefined,
      aliases: row.aliases
        ? row.aliases
            .split("|")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    })
    return participant
  })

  return { participants, warnings }
}

function parseIdentifier(input: string) {
  const value = input.trim()
  if (!value) return { type: "github" as const, value: "" }
  if (value.includes("@")) return { type: "email" as const, value: normalizeEmail(value) }

  const githubLogin = normalizeGithubUsername(value)
  if (!githubUsernamePattern.test(githubLogin)) throw new Error(`invalid GitHub identifier: ${value}`)
  return { type: "github" as const, value: githubLogin }
}

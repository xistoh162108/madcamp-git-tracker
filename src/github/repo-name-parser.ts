export interface RepoMetadata {
  season: string
  week: number
  class: number
  teamNumber: string
}

// Matches github-automation's naming rule (src/naming/index.ts `projectTeamName`): {yy}{semCode}-w{week}-c{class}-{teamNumber}, e.g. "26s-w1-c1-01".
const defaultPattern = /^(?<yy>\d{2})(?<semCode>[sw])-w(?<week>\d+)-c(?<class>\d+)-(?<teamNumber>\d{2})$/

const SEMESTER_BY_CODE: Record<string, "summer" | "winter"> = { s: "summer", w: "winter" }

export function parseRepoName(name: string, expectedSeason?: string): RepoMetadata | null {
  const match = defaultPattern.exec(name)
  if (!match?.groups) return null
  const semester = SEMESTER_BY_CODE[match.groups.semCode!]
  if (!semester) return null
  const metadata = {
    season: `20${match.groups.yy}-${semester}`,
    week: Number(match.groups.week),
    class: Number(match.groups.class),
    teamNumber: match.groups.teamNumber!,
  }
  if (expectedSeason !== undefined && metadata.season !== expectedSeason) return null
  if (!Number.isInteger(metadata.week) || metadata.week <= 0) return null
  if (!Number.isInteger(metadata.class) || metadata.class <= 0) return null
  return metadata
}

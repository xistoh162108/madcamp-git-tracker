import fs from "node:fs"
import path from "node:path"
import { parseParticipantsCsv } from "./parse-participants"

// 분반(class) is a per-participant, camp-wide assignment -- it never changes with a team's repo
// name. Custom-named repos (week 3's "HCIzone", "spk", ...) don't embed a class number the way
// "26s-w3-c1-02" does, so class must come from participants.csv, not a regex on repoName.
export function loadParticipantClasses(): Map<string, number> {
  try {
    const csv = fs.readFileSync(path.join(process.cwd(), "src", "participants", "participants.csv"), "utf8")
    const { participants } = parseParticipantsCsv(csv)
    const map = new Map<string, number>()
    for (const participant of participants) {
      if (participant.class === undefined) continue
      if (participant.githubUsername) map.set(participant.githubUsername, participant.class)
      map.set(participant.participantId, participant.class)
    }
    return map
  } catch {
    return new Map()
  }
}

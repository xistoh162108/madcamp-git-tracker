import { normalizeEmail, normalizeGithubUsername, type Participant } from "../participants/participant-schema"

export interface CommitAuthorInput {
  login?: string | null
  name?: string | null
  email?: string | null
}

export type MatchSource =
  | "author_login"
  | "author_email"
  | "author_name"
  | "committer_login"
  | "committer_email"
  | "committer_name"
  | "coauthor_email"

export interface AuthorMapping {
  participantId?: string
  githubUsername?: string
  unknownReason?: "not_in_participants_csv" | "missing_author" | "bot" | "external"
}

export interface CommitAttributionInput {
  author: CommitAuthorInput
  committer?: CommitAuthorInput
  message?: string | null
}

export interface CommitAttribution {
  matchedParticipants: Array<{ participantId: string; matchSource: MatchSource }>
  detectedBots: string[]
  coAuthors: Array<{ name: string; email: string }>
  attributionStatus: "single_participant" | "multiple_participants" | "bot_with_participant" | "bot_only" | "unknown"
  primaryGithubUsername?: string
  unknownReason?: "not_in_participants_csv" | "missing_author" | "bot" | "external"
}

const botPatterns = [
  /\[bot\]$/i,
  /bot$/i,
  /github-actions/i,
  /dependabot/i,
  /renovate/i,
  /copilot/i,
  /codex/i,
  /claude/i,
  /cursor/i,
  /anthropic/i,
  /openai/i,
  // Camp-ops service account that creates/scaffolds each team's repo -- not a participant, its
  // setup commits shouldn't count as anyone's (or any team's) activity.
  /^madcamp-staff$/i,
]

export function parseCoAuthors(message: string | null | undefined): Array<{ name: string; email: string }> {
  const coAuthors: Array<{ name: string; email: string }> = []
  if (!message) return coAuthors

  const regex = /^Co-authored-by:\s*(.+?)\s*<([^>]+)>$/gim
  let match: RegExpExecArray | null
  while ((match = regex.exec(message)) !== null) {
    coAuthors.push({ name: match[1]!.trim(), email: normalizeEmail(match[2]!) })
  }
  return coAuthors
}

export function isBotIdentity(identity: CommitAuthorInput): boolean {
  const text = [identity.login, identity.name, identity.email].filter(Boolean).join(" ").toLowerCase()
  return botPatterns.some((pattern) => pattern.test(text))
}

export function analyzeCommitAttribution(
  input: CommitAttributionInput,
  participants: Participant[],
): CommitAttribution {
  const coAuthors = parseCoAuthors(input.message)
  const detectedBots = [
    input.author,
    ...(input.committer ? [input.committer] : []),
    ...coAuthors.map((coAuthor) => ({ name: coAuthor.name, email: coAuthor.email })),
  ]
    .filter(isBotIdentity)
    .map((identity) => identityLabel(identity))

  const matchedParticipants = dedupeMatches([
    ...matchIdentity(input.author, "author", participants),
    ...(input.committer ? matchIdentity(input.committer, "committer", participants) : []),
    ...coAuthors.flatMap((coAuthor) =>
      matchByEmail(coAuthor.email, "coauthor_email", participants).map((participantId) => ({
        participantId,
        matchSource: "coauthor_email" as const,
      })),
    ),
  ])

  const hasBot = detectedBots.length > 0
  const primaryGithubUsername = input.author.login ? normalizeGithubUsername(input.author.login) : undefined

  if (hasBot && matchedParticipants.length > 0) {
    return {
      matchedParticipants,
      detectedBots,
      coAuthors,
      attributionStatus: "bot_with_participant",
      primaryGithubUsername,
    }
  }
  if (hasBot) {
    return {
      matchedParticipants,
      detectedBots,
      coAuthors,
      attributionStatus: "bot_only",
      primaryGithubUsername,
      unknownReason: "bot",
    }
  }
  if (matchedParticipants.length > 1) {
    return {
      matchedParticipants,
      detectedBots,
      coAuthors,
      attributionStatus: "multiple_participants",
      primaryGithubUsername,
    }
  }
  if (matchedParticipants.length === 1) {
    return {
      matchedParticipants,
      detectedBots,
      coAuthors,
      attributionStatus: "single_participant",
      primaryGithubUsername,
    }
  }
  return {
    matchedParticipants,
    detectedBots,
    coAuthors,
    attributionStatus: "unknown",
    primaryGithubUsername,
    unknownReason:
      primaryGithubUsername || input.author.email || input.committer?.email
        ? "not_in_participants_csv"
        : "missing_author",
  }
}

export function mapCommitAuthor(author: CommitAuthorInput, participants: Participant[]): AuthorMapping {
  const attribution = analyzeCommitAttribution({ author }, participants)
  return {
    participantId: attribution.matchedParticipants[0]?.participantId,
    githubUsername: attribution.primaryGithubUsername,
    unknownReason: attribution.unknownReason,
  }
}

function matchIdentity(
  identity: CommitAuthorInput,
  role: "author" | "committer",
  participants: Participant[],
): Array<{ participantId: string; matchSource: MatchSource }> {
  const login = identity.login ? normalizeGithubUsername(identity.login) : undefined
  const email = identity.email ? normalizeEmail(identity.email) : undefined
  const name = identity.name ? identity.name.trim() : undefined
  return [
    ...(login
      ? matchByLogin(login, participants).map((participantId) => ({
          participantId,
          matchSource: `${role}_login` as MatchSource,
        }))
      : []),
    ...(email
      ? matchByEmail(email, `${role}_email` as MatchSource, participants).map((participantId) => ({
          participantId,
          matchSource: `${role}_email` as MatchSource,
        }))
      : []),
    // Fallback for unverified local git identities (no linked GitHub login, no matching email):
    // infer the participant when the raw git author name matches their GitHub handle or roster name exactly.
    ...(name
      ? matchByName(name, participants).map((participantId) => ({
          participantId,
          matchSource: `${role}_name` as MatchSource,
        }))
      : []),
  ]
}

function matchByLogin(login: string, participants: Participant[]): string[] {
  return participants
    .filter((candidate) => {
      if (candidate.githubUsername && normalizeGithubUsername(candidate.githubUsername) === login) return true
      return candidate.aliases.some((alias) => normalizeGithubUsername(alias) === login)
    })
    .map((participant) => participant.participantId)
}

function matchByEmail(email: string, _source: MatchSource, participants: Participant[]): string[] {
  return participants
    .filter((candidate) => candidate.email && normalizeEmail(candidate.email) === email)
    .map((participant) => participant.participantId)
}

function matchByName(name: string, participants: Participant[]): string[] {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return []
  return participants
    .filter((candidate) => {
      if (candidate.githubUsername && normalizeGithubUsername(candidate.githubUsername) === normalized) return true
      if (candidate.aliases.some((alias) => alias.trim().toLowerCase() === normalized)) return true
      return candidate.name.trim().toLowerCase() === normalized
    })
    .map((participant) => participant.participantId)
}

function dedupeMatches(matches: Array<{ participantId: string; matchSource: MatchSource }>) {
  const seen = new Set<string>()
  return matches.filter((match) => {
    if (seen.has(match.participantId)) return false
    seen.add(match.participantId)
    return true
  })
}

function identityLabel(identity: CommitAuthorInput): string {
  const candidates = [identity.name, identity.email, identity.login].filter(Boolean) as string[]
  return (
    candidates.find((candidate) => botPatterns.some((pattern) => pattern.test(candidate))) ??
    identity.login ??
    identity.email ??
    identity.name!
  )
}

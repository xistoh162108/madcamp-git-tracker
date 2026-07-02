import { z } from "zod"

export const githubUsernamePattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/

export const ParticipantSchema = z.object({
  participantId: z.string().min(1),
  name: z.string().min(1),
  identifier: z.string().min(1),
  identifierType: z.enum(["github", "email"]),
  githubUsername: z.string().regex(githubUsernamePattern).optional(),
  email: z.string().email().optional(),
  class: z.number().int().positive().optional(),
  aliases: z.array(z.string().min(1)).default([]),
})

export type Participant = z.infer<typeof ParticipantSchema>

export function normalizeGithubUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

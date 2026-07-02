import crypto from "node:crypto"

export const adminSessionCookieName = "madcamp_admin_session"

export function getAdminSessionSignature(token = process.env.ADMIN_TOKEN): string | null {
  if (!token) return null
  return crypto.createHash("sha256").update(`madcamp-admin:${token}`).digest("hex")
}

export function isValidAdminSession(value: string | undefined | null): boolean {
  const expected = getAdminSessionSignature()
  if (!value || !expected) return false

  const actualBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer)
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.ADMIN_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 8,
  }
}

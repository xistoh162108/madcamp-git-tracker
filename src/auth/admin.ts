import type { NextRequest } from "next/server"
import { adminSessionCookieName, isValidAdminSession } from "./admin-session"

export function isAdminAuthorized(request: NextRequest): boolean {
  if (isValidAdminSession(request.cookies.get(adminSessionCookieName)?.value)) return true

  const token = process.env.ADMIN_TOKEN
  if (!token) return false
  return request.headers.get("authorization") === `Bearer ${token}`
}

export function maskSecret(value: string | undefined): string {
  if (!value) return "not configured"
  if (value.length <= 8) return "configured"
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

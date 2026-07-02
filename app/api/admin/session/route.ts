import { NextRequest, NextResponse } from "next/server"
import { adminSessionCookieName, adminSessionCookieOptions, getAdminSessionSignature } from "@/src/auth/admin-session"

export async function POST(request: NextRequest) {
  const { token, next } = (await request.json().catch(() => ({}))) as { token?: string; next?: string }
  const expected = process.env.ADMIN_TOKEN
  const signature = getAdminSessionSignature(token)

  if (!expected || token !== expected || !signature) {
    return NextResponse.json({ ok: false, error: "invalid admin token" }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true, next: next?.startsWith("/admin") ? next : "/admin" })
  response.cookies.set(adminSessionCookieName, signature, adminSessionCookieOptions())
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(adminSessionCookieName, "", { ...adminSessionCookieOptions(), maxAge: 0 })
  return response
}

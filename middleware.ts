import { NextRequest, NextResponse } from "next/server"

const cookieName = "madcamp_admin_session"

async function sessionSignature(token: string) {
  const data = new TextEncoder().encode(`madcamp-admin:${token}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") return NextResponse.next()

  const token = process.env.ADMIN_TOKEN
  if (!token) return redirectToLogin(request, pathname)

  const expected = await sessionSignature(token)
  const actual = request.cookies.get(cookieName)?.value
  if (actual === expected) return NextResponse.next()

  return redirectToLogin(request, pathname)
}

export const config = {
  matcher: ["/admin/:path*"],
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = "/admin/login"
  url.searchParams.set("next", pathname)
  return NextResponse.redirect(url)
}

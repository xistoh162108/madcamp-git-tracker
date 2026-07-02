import type { Metadata } from "next"
import { AdminLoginForm } from "@/components/admin-login-form"

export const metadata: Metadata = {
  title: "관리자 로그인 · 몰입 랭킹",
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const nextPath = next?.startsWith("/admin") ? next : "/admin"

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <AdminLoginForm nextPath={nextPath} />
    </main>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, SlidersHorizontal, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/admin", label: "설정", icon: SlidersHorizontal },
  { href: "/admin/sync", label: "동기화 상태", icon: RefreshCw },
]

export function AdminShell({ children, displayName }: { children: React.ReactNode; displayName?: string }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 리더보드
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-bold">관리자 설정</span>
          <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {displayName ?? "MadCamp"}
          </span>
          <nav className="ml-auto flex gap-1">
            {tabs.map((t) => {
              const active = pathname === t.href
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}

export function SettingsSection({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card/70 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

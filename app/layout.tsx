import type { Metadata } from "next"
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-kr",
})

export const metadata: Metadata = {
  title: "몰입 랭킹 · MadCamp GitHub 리더보드",
  description: "팀별 repository 활동을 기반으로 이번 주와 전체 기간의 개발 흐름을 확인하세요.",
}

export const viewport = {
  themeColor: "#0b0f17",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="dark bg-background">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} font-sans antialiased`}
        style={{ fontFamily: "var(--font-noto-kr), var(--font-geist-sans), sans-serif" }}
      >
        {children}
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  )
}

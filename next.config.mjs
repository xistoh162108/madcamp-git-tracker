/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Set only for the frozen static export build (see scripts/export-static-site.sh), which
  // temporarily removes app/api, app/admin, and middleware.ts before building -- none of those
  // survive `output: "export"`. The normal `next build`/`next start` dynamic-mode path (kept for
  // next camp season) must not set this.
  ...(process.env.STATIC_EXPORT === "1" ? { output: "export" } : {}),
}

export default nextConfig

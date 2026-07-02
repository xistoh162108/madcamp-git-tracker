export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b0f17"/><path d="M18 39h28v5H18zM18 29h21v5H18zM18 19h28v5H18z" fill="#38bdf8"/><circle cx="47" cy="41.5" r="5.5" fill="#facc15"/></svg>`

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400",
    },
  })
}

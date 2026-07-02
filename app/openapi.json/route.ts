import { NextResponse } from "next/server"

export function GET() {
  return NextResponse.json(
    {
      openapi: "3.1.0",
      info: { title: "MadCamp GitHub Activity Leaderboard API", version: "0.1.0" },
      paths: {
        "/api/health": { get: { responses: { "200": { description: "Health status" } } } },
        "/api/config/public": { get: { responses: { "200": { description: "Public camp config" } } } },
        "/api/snapshots/latest": { get: { responses: { "200": { description: "Latest public snapshot" } } } },
        "/api/admin/discovery": {
          get: {
            security: [{ bearerAuth: [] }],
            responses: {
              "200": { description: "Repository discovery result" },
              "401": { description: "Unauthorized" },
            },
          },
        },
        "/api/admin/rate-limit": {
          get: {
            security: [{ bearerAuth: [] }],
            responses: { "200": { description: "GitHub rate limit" }, "401": { description: "Unauthorized" } },
          },
        },
        "/api/admin/sync": {
          post: {
            security: [{ bearerAuth: [] }],
            responses: { "200": { description: "Sync completed" }, "401": { description: "Unauthorized" } },
          },
        },
        "/api/admin/upload-participants": {
          post: {
            security: [{ bearerAuth: [] }],
            responses: {
              "200": { description: "CSV validation result" },
              "400": { description: "Invalid CSV" },
              "401": { description: "Unauthorized" },
              "413": { description: "CSV too large" },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
        },
      },
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  )
}

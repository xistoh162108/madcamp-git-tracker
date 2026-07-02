import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/aggregation/aggregate.ts",
        "src/auth/admin-session.ts",
        "src/config/schema.ts",
        "src/config/write-config.ts",
        "src/github/discover-repos.ts",
        "src/github/repo-name-parser.ts",
        "src/participants/parse-participants.ts",
        "src/participants/participant-schema.ts",
        "src/snapshot/fallback.ts",
        "src/sync/map-commit-author.ts",
        "src/sync/sync-state.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})

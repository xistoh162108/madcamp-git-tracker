import fs from "node:fs"
import path from "node:path"
import { AppConfigSchema, type AppConfig } from "./schema"

export function loadConfig(configPath = path.join(process.cwd(), "config", "madcamp.config.json")): AppConfig {
  const raw = fs.readFileSync(configPath, "utf8")
  return AppConfigSchema.parse(JSON.parse(raw))
}

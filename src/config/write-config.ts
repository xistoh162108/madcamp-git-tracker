import fs from "node:fs"
import path from "node:path"
import { AppConfigSchema, type AppConfig } from "./schema"

const defaultConfigPath = path.join(process.cwd(), "config", "madcamp.config.json")

export function writeConfig(config: AppConfig, configPath = defaultConfigPath): AppConfig {
  const parsed = AppConfigSchema.parse(config)
  fs.mkdirSync(path.dirname(configPath), { recursive: true })

  const tempPath = `${configPath}.${process.pid}.tmp`
  fs.writeFileSync(tempPath, `${JSON.stringify(parsed, null, 2)}\n`)
  fs.renameSync(tempPath, configPath)
  return parsed
}

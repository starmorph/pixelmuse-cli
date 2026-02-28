import envPaths from 'env-paths'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import YAML from 'yaml'

const paths = envPaths('pixelmuse-cli')

/** XDG-compliant directory paths */
export const PATHS = {
  config: paths.config,
  data: paths.data,
  auth: join(paths.config, 'auth.json'),
  settings: join(paths.config, 'config.yaml'),
  prompts: join(paths.config, 'prompts'),
  generations: join(paths.data, 'generations'),
}

export interface Settings {
  defaultModel: string
  defaultAspectRatio: string
  defaultStyle: string
  autoPreview: boolean
  autoSave: boolean
}

const DEFAULT_SETTINGS: Settings = {
  defaultModel: 'nano-banana-2',
  defaultAspectRatio: '1:1',
  defaultStyle: 'none',
  autoPreview: true,
  autoSave: true,
}

/** Ensure all config/data directories exist */
export function ensureDirs(): void {
  for (const dir of [PATHS.config, PATHS.data, PATHS.prompts, PATHS.generations]) {
    mkdirSync(dir, { recursive: true })
  }
}

/** Read user settings, creating defaults if missing */
export function readSettings(): Settings {
  ensureDirs()
  if (!existsSync(PATHS.settings)) {
    writeSettings(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  try {
    const raw = readFileSync(PATHS.settings, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...YAML.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Write user settings to disk */
export function writeSettings(settings: Settings): void {
  ensureDirs()
  writeFileSync(PATHS.settings, YAML.stringify(settings), 'utf-8')
}

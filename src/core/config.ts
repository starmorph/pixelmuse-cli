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
  defaultVisibility: 'public' | 'private'
  autoPreview: boolean
  autoSave: boolean
}

const DEFAULT_SETTINGS: Settings = {
  defaultModel: 'nano-banana-2',
  defaultAspectRatio: '1:1',
  defaultStyle: 'none',
  defaultVisibility: 'private',
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
    const parsed = { ...DEFAULT_SETTINGS, ...YAML.parse(raw) } as Settings

    const VALID_MODELS = ['nano-banana-2', 'nano-banana-pro', 'flux-schnell', 'imagen-3', 'recraft-v4', 'recraft-v4-pro']
    const VALID_RATIOS = ['1:1', '16:9', '9:16', '3:2', '2:3', '4:5', '5:4', '3:4', '4:3', '21:9', '9:21']
    const VALID_STYLES = ['realistic', 'anime', 'artistic', 'none']
    const VALID_VISIBILITY = ['public', 'private']

    if (!VALID_MODELS.includes(parsed.defaultModel)) parsed.defaultModel = DEFAULT_SETTINGS.defaultModel
    if (!VALID_RATIOS.includes(parsed.defaultAspectRatio)) parsed.defaultAspectRatio = DEFAULT_SETTINGS.defaultAspectRatio
    if (!VALID_STYLES.includes(parsed.defaultStyle)) parsed.defaultStyle = DEFAULT_SETTINGS.defaultStyle
    if (!VALID_VISIBILITY.includes(parsed.defaultVisibility)) parsed.defaultVisibility = DEFAULT_SETTINGS.defaultVisibility
    if (typeof parsed.autoPreview !== 'boolean') parsed.autoPreview = DEFAULT_SETTINGS.autoPreview
    if (typeof parsed.autoSave !== 'boolean') parsed.autoSave = DEFAULT_SETTINGS.autoSave

    return parsed
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Write user settings to disk */
export function writeSettings(settings: Settings): void {
  ensureDirs()
  writeFileSync(PATHS.settings, YAML.stringify(settings), 'utf-8')
}

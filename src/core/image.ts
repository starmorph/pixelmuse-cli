import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { PATHS } from './config.js'

/** Check if chafa is available (cached) */
let _chafaAvailable: boolean | null = null
export function hasChafa(): boolean {
  if (_chafaAvailable !== null) return _chafaAvailable
  try {
    execSync('chafa --version', { stdio: 'ignore' })
    _chafaAvailable = true
  } catch {
    _chafaAvailable = false
  }
  return _chafaAvailable
}

/** Convert generation output (base64 data URI or URL) to a Buffer */
export async function imageToBuffer(output: string): Promise<Buffer> {
  if (output.startsWith('data:')) {
    const base64 = output.split(',', 2)[1]
    if (!base64) throw new Error('Invalid data URI: missing base64 content')
    return Buffer.from(base64, 'base64')
  }
  // HTTPS URL — fetch and buffer
  const res = await fetch(output)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Save image buffer to a specific path */
export function saveImage(buffer: Buffer, path: string): string {
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(path, buffer)
  return path
}

/** Auto-save to config/generations/ directory */
export function autoSave(id: string, buffer: Buffer): string {
  const dir = PATHS.generations
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const path = join(dir, `${id}.png`)
  writeFileSync(path, buffer)
  return path
}

/**
 * Render image directly to the terminal via stdio: 'inherit'.
 * Chafa auto-detects the best graphics protocol (kitty, iterm, sixels, symbols).
 * This MUST be called when Ink is NOT actively rendering (after exit).
 */
export function renderImageDirect(path: string): boolean {
  if (!hasChafa()) return false

  try {
    execSync(`chafa --animate off "${path}"`, {
      stdio: 'inherit',
      maxBuffer: 10 * 1024 * 1024,
    })
    return true
  } catch {
    return false
  }
}

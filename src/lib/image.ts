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
    const base64 = output.split(',', 2)[1]!
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

/** Render image to terminal string using chafa (preferred) or terminal-image (fallback) */
export async function renderImage(
  pathOrBuffer: string | Buffer,
  opts: { width?: number } = {},
): Promise<string> {
  const cols = opts.width ?? Math.min(process.stdout.columns ?? 80, 100)

  // Try chafa first
  if (hasChafa() && typeof pathOrBuffer === 'string') {
    try {
      const result = execSync(`chafa --size ${cols} --animate off "${pathOrBuffer}"`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      })
      return result
    } catch {
      // fall through to terminal-image
    }
  }

  // Fallback: terminal-image
  try {
    const terminalImage = await import('terminal-image')
    if (typeof pathOrBuffer === 'string') {
      return await terminalImage.default.file(pathOrBuffer, { width: cols })
    }
    return await terminalImage.default.buffer(pathOrBuffer, { width: cols })
  } catch {
    return '[Image preview unavailable — install chafa or terminal-image]'
  }
}

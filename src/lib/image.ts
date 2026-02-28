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

/**
 * Render image directly to stdout, bypassing Ink's layout engine.
 * Clears the screen first so the image gets a clean canvas,
 * then Ink re-renders its UI below the image output.
 * Returns true if rendered, false if no renderer available.
 */
export async function renderImageToStdout(
  pathOrBuffer: string | Buffer,
  opts: { width?: number } = {},
): Promise<boolean> {
  const cols = opts.width ?? Math.min(process.stdout.columns ?? 80, 80)

  // Clear screen so chafa output doesn't overlap Ink UI
  process.stdout.write('\x1b[2J\x1b[H')

  // Try chafa first
  if (hasChafa() && typeof pathOrBuffer === 'string') {
    try {
      const result = execSync(`chafa --size ${cols} --animate off "${pathOrBuffer}"`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      })
      process.stdout.write(result)
      return true
    } catch {
      // fall through
    }
  }

  // Fallback: terminal-image
  try {
    const terminalImage = await import('terminal-image')
    let result: string
    if (typeof pathOrBuffer === 'string') {
      result = await terminalImage.default.file(pathOrBuffer, { width: cols })
    } else {
      result = await terminalImage.default.buffer(pathOrBuffer, { width: cols })
    }
    process.stdout.write(result)
    return true
  } catch {
    return false
  }
}

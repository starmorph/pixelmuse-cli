import { describe, expect, it } from 'vitest'
import { safeOpen } from './safe-open.js'

describe('safeOpen', () => {
  it('returns ok true when open succeeds', async () => {
    const openTarget = async (_target: string): Promise<void> => {}
    await expect(safeOpen(openTarget, 'https://example.com')).resolves.toEqual({ ok: true })
  })

  it('returns ok false and preserves error message on failure', async () => {
    const openTarget = async (_target: string): Promise<void> => {
      throw new Error('spawn xdg-open ENOENT')
    }
    await expect(safeOpen(openTarget, 'https://example.com')).resolves.toEqual({
      ok: false,
      error: 'spawn xdg-open ENOENT',
    })
  })

  it('returns fallback message for non-Error throws', async () => {
    const openTarget = async (_target: string): Promise<void> => {
      throw 'boom'
    }
    await expect(safeOpen(openTarget, 'https://example.com')).resolves.toEqual({
      ok: false,
      error: 'Failed to open browser',
    })
  })
})

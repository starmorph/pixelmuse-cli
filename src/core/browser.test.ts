import { describe, expect, it, vi } from 'vitest'
import { openGenerationInBrowser } from './browser.js'

describe('openGenerationInBrowser', () => {
  it('opens encoded generation URL and returns null on success', async () => {
    const openUrl = vi.fn(async (_target: string) => undefined)
    const error = await openGenerationInBrowser('gen/with spaces', openUrl)

    expect(error).toBeNull()
    expect(openUrl).toHaveBeenCalledWith('https://www.pixelmuse.studio/g/gen%2Fwith%20spaces')
  })

  it('returns readable error when open fails', async () => {
    const openUrl = vi.fn(async (_target: string) => {
      throw new Error('No browser available')
    })
    const error = await openGenerationInBrowser('abc123', openUrl)

    expect(error).toBe('No browser available')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { openGenerationInBrowser } from './browser.js'

describe('openGenerationInBrowser', () => {
  it('opens the generation URL and returns null on success', async () => {
    const openFn = vi.fn().mockResolvedValue(undefined)
    const result = await openGenerationInBrowser('gen_123', openFn)

    expect(openFn).toHaveBeenCalledOnce()
    expect(openFn).toHaveBeenCalledWith('https://www.pixelmuse.studio/g/gen_123')
    expect(result).toBeNull()
  })

  it('returns the error message when open fails', async () => {
    const openFn = vi.fn().mockRejectedValue(new Error('No browser available'))
    const result = await openGenerationInBrowser('gen_123', openFn)

    expect(result).toBe('No browser available')
  })
})

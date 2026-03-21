import { describe, it, expect, vi } from 'vitest'
import { openGenerationInBrowser } from './GalleryDetail.js'

describe('openGenerationInBrowser', () => {
  it('opens the generation URL', async () => {
    const setError = vi.fn<(value: string | null) => void>()
    const openBrowser = vi.fn<(target: string) => Promise<unknown>>().mockResolvedValue(undefined)

    openGenerationInBrowser('gen_123', setError, openBrowser)
    await Promise.resolve()

    expect(openBrowser).toHaveBeenCalledWith('https://www.pixelmuse.studio/g/gen_123')
    expect(setError).not.toHaveBeenCalled()
  })

  it('handles browser open failures without throwing', async () => {
    const setError = vi.fn<(value: string | null) => void>()
    const openBrowser = vi
      .fn<(target: string) => Promise<unknown>>()
      .mockRejectedValue(new Error('No browser available'))

    expect(() => openGenerationInBrowser('gen_456', setError, openBrowser)).not.toThrow()
    await Promise.resolve()

    expect(setError).toHaveBeenCalledWith('No browser available')
  })
})

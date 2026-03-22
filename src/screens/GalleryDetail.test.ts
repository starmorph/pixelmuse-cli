import { describe, expect, it, vi } from 'vitest'
import { openGenerationInBrowser } from './GalleryDetail.js'

describe('openGenerationInBrowser', () => {
  it('opens expected gallery URL', async () => {
    const openFn = vi.fn<(_: string) => Promise<void>>().mockResolvedValue(undefined)

    const result = await openGenerationInBrowser('gen_123', openFn)

    expect(result).toBeNull()
    expect(openFn).toHaveBeenCalledWith('https://www.pixelmuse.studio/g/gen_123')
  })

  it('returns error message when open fails', async () => {
    const openFn = vi
      .fn<(_: string) => Promise<void>>()
      .mockRejectedValue(new Error('spawn xdg-open ENOENT'))

    const result = await openGenerationInBrowser('gen_123', openFn)

    expect(result).toBe('spawn xdg-open ENOENT')
  })
})

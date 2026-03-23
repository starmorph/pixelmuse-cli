import { describe, it, expect, vi } from 'vitest'
import { openGenerationInBrowser } from './GalleryDetail.js'

describe('openGenerationInBrowser', () => {
  it('opens the expected generation URL', async () => {
    const openInBrowser = vi.fn().mockResolvedValue(undefined)
    const onError = vi.fn()

    await openGenerationInBrowser('gen_123', onError, openInBrowser)

    expect(openInBrowser).toHaveBeenCalledWith('https://www.pixelmuse.studio/g/gen_123')
    expect(onError).not.toHaveBeenCalled()
  })

  it('captures open errors without rejecting', async () => {
    const openInBrowser = vi.fn().mockRejectedValue(new Error('xdg-open not found'))
    const onError = vi.fn()

    await expect(openGenerationInBrowser('gen_123', onError, openInBrowser)).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledWith('xdg-open not found')
  })
})

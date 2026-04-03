import { describe, it, expect, vi } from 'vitest'
import { openInBrowser } from './browser.js'

describe('openInBrowser', () => {
  it('calls provided opener with the target URL', async () => {
    const openUrl = vi.fn(async (_url: string) => undefined)
    const url = 'https://www.pixelmuse.studio/g/abc123'

    await openInBrowser(url, { openUrl })

    expect(openUrl).toHaveBeenCalledTimes(1)
    expect(openUrl).toHaveBeenCalledWith(url)
  })

  it('propagates opener failures to caller', async () => {
    const openUrl = vi.fn(async (_url: string) => {
      throw new Error('No browser available')
    })

    await expect(
      openInBrowser('https://www.pixelmuse.studio/g/abc123', { openUrl }),
    ).rejects.toThrow('No browser available')
  })
})

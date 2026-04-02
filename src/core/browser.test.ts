import { describe, it, expect, vi, afterEach } from 'vitest'
import { openGenerationInBrowser } from './browser.js'

const launchMock = vi.fn<(target: string) => Promise<void>>()

afterEach(() => {
  launchMock.mockReset()
})

describe('openGenerationInBrowser', () => {
  it('opens the generation URL and reports success', async () => {
    launchMock.mockResolvedValueOnce()
    const result = await openGenerationInBrowser('abc123', launchMock)

    expect(launchMock).toHaveBeenCalledWith('https://www.pixelmuse.studio/g/abc123')
    expect(result).toEqual({ ok: true, message: null })
  })

  it('returns friendly error when browser launch fails', async () => {
    launchMock.mockRejectedValueOnce(new Error('no xdg-open'))
    const result = await openGenerationInBrowser('abc123', launchMock)

    expect(launchMock).toHaveBeenCalledWith('https://www.pixelmuse.studio/g/abc123')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Failed to open browser')
    expect(result.message).toContain('https://www.pixelmuse.studio/g/abc123')
  })
})

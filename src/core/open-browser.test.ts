import { describe, it, expect } from 'vitest'
import { openGenerationInBrowser, openUrlSafely } from './open-browser.js'

describe('openGenerationInBrowser', () => {
  it('returns null when browser open succeeds', async () => {
    const seenUrls: string[] = []
    const result = await openGenerationInBrowser('gen_123', async (url) => {
      seenUrls.push(url)
      return undefined
    })

    expect(result).toBeNull()
    expect(seenUrls).toEqual(['https://www.pixelmuse.studio/g/gen_123'])
  })

  it('returns error message when browser open fails', async () => {
    const result = await openGenerationInBrowser('gen_456', async () => {
      throw new Error('no browser available')
    })

    expect(result).toBe('no browser available')
  })

  it('returns fallback message for non-Error throws', async () => {
    const result = await openGenerationInBrowser('gen_789', async () => {
      throw { code: 'EFAIL' }
    })

    expect(result).toBe('Failed to open browser')
  })
})

describe('openUrlSafely', () => {
  it('opens an arbitrary URL unchanged', async () => {
    const seenUrls: string[] = []
    const result = await openUrlSafely('https://checkout.example/session/abc', async (url) => {
      seenUrls.push(url)
      return undefined
    })

    expect(result).toBeNull()
    expect(seenUrls).toEqual(['https://checkout.example/session/abc'])
  })
})

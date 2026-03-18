import { describe, it, expect, vi, beforeEach } from 'vitest'

const openMock = vi.fn<(...args: [string]) => Promise<unknown>>()

vi.mock('open', () => ({
  default: (url: string) => openMock(url),
}))

import { openUrlSafe } from './browser.js'

describe('openUrlSafe', () => {
  beforeEach(() => {
    openMock.mockReset()
  })

  it('forwards url to open', () => {
    openMock.mockResolvedValue(undefined)
    const onError = vi.fn<(message: string) => void>()

    openUrlSafe('https://www.pixelmuse.studio/g/gen_123', onError)

    expect(openMock).toHaveBeenCalledWith('https://www.pixelmuse.studio/g/gen_123')
    expect(onError).not.toHaveBeenCalled()
  })

  it('surfaces failures without throwing', async () => {
    openMock.mockRejectedValue(new Error('No browser available'))
    const onError = vi.fn<(message: string) => void>()

    expect(() => {
      openUrlSafe('https://www.pixelmuse.studio/g/gen_456', onError)
    }).not.toThrow()

    await Promise.resolve()
    await Promise.resolve()

    expect(onError).toHaveBeenCalledWith('No browser available')
  })
})

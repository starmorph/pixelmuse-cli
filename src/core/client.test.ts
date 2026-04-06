import { afterEach, describe, expect, it, vi } from 'vitest'
import { PixelmuseClient } from './client.js'

describe('PixelmuseClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handles 204 delete responses without trying to parse JSON', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    const client = new PixelmuseClient(`pm_live_${'a'.repeat(32)}`)

    await expect(client.deleteGeneration('img_123')).resolves.toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://www.pixelmuse.studio/api/v1/images/img_123',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

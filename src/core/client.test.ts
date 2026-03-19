import { afterEach, describe, expect, it, vi } from 'vitest'
import { PixelmuseClient } from './client.js'

describe('PixelmuseClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handles successful DELETE responses with empty bodies', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    )
    const client = new PixelmuseClient('pm_test_' + 'a'.repeat(32))

    await expect(client.deleteGeneration('gen_123')).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.pixelmuse.studio/api/v1/images/gen_123',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

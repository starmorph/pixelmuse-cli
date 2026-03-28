import { afterEach, describe, expect, it, vi } from 'vitest'
import { PixelmuseClient } from './client.js'
import { ApiError } from './types.js'

describe('PixelmuseClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deleteGeneration succeeds for 204 No Content responses', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    )

    const client = new PixelmuseClient('pm_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')

    await expect(client.deleteGeneration('gen_123')).resolves.toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('getGeneration still parses successful JSON responses', async () => {
    const generationPayload = {
      id: 'gen_123',
      status: 'succeeded',
      model: 'nano-banana-2',
      prompt: 'test prompt',
      output: ['data:image/png;base64,AAAA'],
      credits_charged: 1,
      error: null,
      created_at: '2026-03-28T00:00:00.000Z',
      completed_at: '2026-03-28T00:00:01.000Z',
      visibility: 'private',
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(generationPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const client = new PixelmuseClient('pm_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    const result = await client.getGeneration('gen_123')

    expect(result.id).toBe('gen_123')
    expect(result.status).toBe('succeeded')
  })

  it('surfaces structured API errors from JSON payloads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: 'Quota exceeded', code: 'QUOTA_EXCEEDED' },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'Retry-After': '12',
          },
        },
      ),
    )

    const client = new PixelmuseClient('pm_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')

    await expect(client.getAccount()).rejects.toMatchObject<ApiError>({
      message: 'Quota exceeded',
      status: 429,
      code: 'QUOTA_EXCEEDED',
      rateLimitRemaining: 0,
      retryAfter: 12,
    })
  })
})

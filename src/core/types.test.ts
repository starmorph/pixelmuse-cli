import { describe, it, expect } from 'vitest'
import { ApiError } from './types.js'

describe('ApiError', () => {
  it('constructs with all fields', () => {
    const err = new ApiError('Not found', 404, 'NOT_FOUND', 99, 30)
    expect(err.message).toBe('Not found')
    expect(err.status).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.rateLimitRemaining).toBe(99)
    expect(err.retryAfter).toBe(30)
    expect(err.name).toBe('ApiError')
    expect(err).toBeInstanceOf(Error)
  })

  it('constructs with minimal fields', () => {
    const err = new ApiError('Bad request', 400)
    expect(err.code).toBeUndefined()
    expect(err.rateLimitRemaining).toBeUndefined()
  })
})

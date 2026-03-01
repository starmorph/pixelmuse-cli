import { describe, it, expect, vi, afterEach } from 'vitest'
import { timeAgo } from './utils.js'

describe('timeAgo', () => {
  afterEach(() => vi.useRealTimers())

  it('returns "just now" for < 60 seconds', () => {
    vi.useFakeTimers({ now: new Date('2025-01-01T12:01:00Z') })
    expect(timeAgo(new Date('2025-01-01T12:00:30Z'))).toBe('just now')
  })

  it('returns minutes for < 1 hour', () => {
    vi.useFakeTimers({ now: new Date('2025-01-01T12:30:00Z') })
    expect(timeAgo(new Date('2025-01-01T12:00:00Z'))).toBe('30m ago')
  })

  it('returns hours for < 1 day', () => {
    vi.useFakeTimers({ now: new Date('2025-01-01T15:00:00Z') })
    expect(timeAgo(new Date('2025-01-01T12:00:00Z'))).toBe('3h ago')
  })

  it('returns days for < 1 week', () => {
    vi.useFakeTimers({ now: new Date('2025-01-04T12:00:00Z') })
    expect(timeAgo(new Date('2025-01-01T12:00:00Z'))).toBe('3d ago')
  })

  it('returns locale date string for > 1 week', () => {
    vi.useFakeTimers({ now: new Date('2025-02-01T12:00:00Z') })
    const result = timeAgo(new Date('2025-01-01T12:00:00Z'))
    expect(result).not.toContain('ago')
    expect(result).not.toBe('just now')
  })
})

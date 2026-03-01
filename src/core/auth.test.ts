import { describe, it, expect } from 'vitest'
import { isValidKeyFormat } from './auth.js'

describe('isValidKeyFormat', () => {
  it('accepts valid live key', () => {
    expect(isValidKeyFormat('pm_live_' + 'a'.repeat(32))).toBe(true)
  })

  it('accepts valid test key', () => {
    expect(isValidKeyFormat('pm_test_' + '0123456789abcdef'.repeat(2))).toBe(true)
  })

  it('rejects key with wrong prefix', () => {
    expect(isValidKeyFormat('sk_live_' + 'a'.repeat(32))).toBe(false)
  })

  it('rejects key that is too short', () => {
    expect(isValidKeyFormat('pm_live_abc')).toBe(false)
  })

  it('rejects key with uppercase hex', () => {
    expect(isValidKeyFormat('pm_live_' + 'A'.repeat(32))).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidKeyFormat('')).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { buildMacClipboardArgs } from './clipboard.js'

describe('buildMacClipboardArgs', () => {
  it('passes image path as argv, not interpolated script', () => {
    const maliciousPath = 'safe" ) & do shell script "touch /tmp/pwned" & ("'
    const args = buildMacClipboardArgs(maliciousPath)

    expect(args.at(-1)).toBe(maliciousPath)
    expect(args.slice(0, -1).join(' ')).not.toContain(maliciousPath)
  })
})

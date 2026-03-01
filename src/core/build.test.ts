import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DIST = resolve(import.meta.dirname, '../../dist')

describe('build output', () => {
  it('produces cli.js with shebang', () => {
    const path = resolve(DIST, 'cli.js')
    expect(existsSync(path)).toBe(true)
    const content = readFileSync(path, 'utf-8')
    expect(content).toContain('#!/usr/bin/env node')
    expect(content.length).toBeGreaterThan(100)
  })

  it('produces tui.js', () => {
    expect(existsSync(resolve(DIST, 'tui.js'))).toBe(true)
  })

  it('produces mcp/server.js with shebang', () => {
    const path = resolve(DIST, 'mcp/server.js')
    expect(existsSync(path)).toBe(true)
    const content = readFileSync(path, 'utf-8')
    expect(content).toContain('#!/usr/bin/env node')
  })
})

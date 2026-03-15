import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { configureMcp, type EditorInfo } from './mcp-config.js'

function buildEditor(configPath: string): EditorInfo {
  return {
    name: 'Test Editor',
    id: 'test-editor',
    configPath,
    installed: true,
  }
}

function fileMode(path: string): number {
  return statSync(path).mode & 0o777
}

describe('configureMcp', () => {
  it('writes pixelmuse server with provided api key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pixelmuse-mcp-'))
    const configPath = join(dir, 'mcp.json')
    const apiKey = 'pm_live_' + 'a'.repeat(32)

    try {
      configureMcp(buildEditor(configPath), apiKey)

      const body = JSON.parse(readFileSync(configPath, 'utf-8')) as {
        mcpServers?: Record<string, { env?: Record<string, string> }>
      }
      expect(body.mcpServers?.pixelmuse?.env?.PIXELMUSE_API_KEY).toBe(apiKey)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('creates config files with owner-only permissions on unix', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pixelmuse-mcp-'))
    const configPath = join(dir, 'mcp.json')

    try {
      configureMcp(buildEditor(configPath), 'pm_live_' + 'b'.repeat(32))

      if (process.platform !== 'win32') {
        expect(fileMode(configPath)).toBe(0o600)
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('tightens permissions for existing permissive config files on unix', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pixelmuse-mcp-'))
    const configPath = join(dir, 'mcp.json')

    try {
      writeFileSync(configPath, JSON.stringify({ mcpServers: {} }) + '\n', 'utf-8')
      if (process.platform !== 'win32') {
        chmodSync(configPath, 0o644)
      }

      configureMcp(buildEditor(configPath), 'pm_live_' + 'c'.repeat(32))

      if (process.platform !== 'win32') {
        expect(fileMode(configPath)).toBe(0o600)
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

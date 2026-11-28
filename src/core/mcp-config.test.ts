import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { configureMcp, listEditorTargets, MCP_SERVER_ARGS, type EditorInfo } from './mcp-config.js'

const FAKE_KEY = `pm_live_${'a'.repeat(32)}`

function editor(configPath: string): EditorInfo {
  return { name: 'Claude Code', id: 'claude-code', configPath, installed: true }
}

describe('MCP server launch args', () => {
  it('runs the pixelmuse-mcp bin from the published pixelmuse package', () => {
    expect([...MCP_SERVER_ARGS]).toEqual(['-y', '--package=pixelmuse', 'pixelmuse-mcp'])
  })

  it('does not document the unclaimed pixelmuse-mcp package', () => {
    const root = fileURLToPath(new URL('../..', import.meta.url))
    for (const rel of ['README.md', 'llms.txt']) {
      const text = readFileSync(join(root, rel), 'utf-8')
      expect(text).not.toContain('["-y", "pixelmuse-mcp"]')
      expect(text).toContain('["-y", "--package=pixelmuse", "pixelmuse-mcp"]')
    }
  })
})

describe('editor config targets', () => {
  it('writes Claude Code user servers into ~/.claude.json', () => {
    const claude = listEditorTargets().find((target) => target.id === 'claude-code')
    expect(claude?.configPath).toBe(join(homedir(), '.claude.json'))
  })
})

describe('configureMcp', () => {
  it('merges the server into an existing config without dropping other keys', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pixelmuse-mcp-'))
    const configPath = join(dir, '.claude.json')
    writeFileSync(
      configPath,
      JSON.stringify({
        userID: 'user_123',
        mcpServers: { other: { command: 'node', args: ['other.js'] } },
      }),
    )

    configureMcp(editor(configPath), FAKE_KEY)

    const written: unknown = JSON.parse(readFileSync(configPath, 'utf-8'))
    expect(written).toMatchObject({
      userID: 'user_123',
      mcpServers: {
        other: { command: 'node', args: ['other.js'] },
      },
    })
    expect(written).toMatchObject({
      mcpServers: {
        pixelmuse: {
          command: 'npx',
          args: ['-y', '--package=pixelmuse', 'pixelmuse-mcp'],
          env: { PIXELMUSE_API_KEY: FAKE_KEY },
        },
      },
    })
  })

  it('leaves an unparseable config file untouched', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pixelmuse-mcp-'))
    const configPath = join(dir, '.claude.json')
    const original = '{ not json'
    writeFileSync(configPath, original)

    expect(() => configureMcp(editor(configPath), FAKE_KEY)).toThrow(/Failed to parse/)
    expect(readFileSync(configPath, 'utf-8')).toBe(original)
  })
})

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

interface McpServerEntry {
  command: string
  args: string[]
  env?: Record<string, string>
}

interface McpConfig {
  mcpServers?: Record<string, McpServerEntry>
}

export interface EditorInfo {
  name: string
  id: string
  configPath: string
  installed: boolean
}

const HOME = homedir()

const EDITORS: Omit<EditorInfo, 'installed'>[] = [
  {
    name: 'Claude Code',
    id: 'claude-code',
    configPath: join(HOME, '.claude', 'mcp.json'),
  },
  {
    name: 'Cursor',
    id: 'cursor',
    configPath: join(HOME, '.cursor', 'mcp.json'),
  },
  {
    name: 'Windsurf',
    id: 'windsurf',
    configPath: join(HOME, '.codeium', 'windsurf', 'mcp_config.json'),
  },
]

/** Detect which AI editors have config directories present */
export function detectEditors(): EditorInfo[] {
  return EDITORS.map((editor) => ({
    ...editor,
    installed: existsSync(dirname(editor.configPath)),
  }))
}

/** Add pixelmuse MCP server entry to an editor's config */
export function configureMcp(editor: EditorInfo, apiKey: string): void {
  const entry: McpServerEntry = {
    command: 'npx',
    args: ['-y', 'pixelmuse-mcp'],
    env: { PIXELMUSE_API_KEY: apiKey },
  }

  let config: McpConfig = {}

  if (existsSync(editor.configPath)) {
    try {
      config = JSON.parse(readFileSync(editor.configPath, 'utf-8')) as McpConfig
    } catch {
      throw new Error(`Failed to parse ${editor.configPath}. Fix the JSON manually or delete the file to start fresh.`)
    }
  } else {
    mkdirSync(dirname(editor.configPath), { recursive: true })
  }

  config.mcpServers = config.mcpServers ?? {}
  config.mcpServers.pixelmuse = entry

  writeFileSync(editor.configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  try {
    chmodSync(editor.configPath, 0o600)
  } catch {
  }
}

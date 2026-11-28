import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
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

/**
 * Args for `npx` that run the `pixelmuse-mcp` bin from the published `pixelmuse` package.
 * There is no `pixelmuse-mcp` package; `npx -y pixelmuse-mcp` 404s, and a later publish of that name would be executed with the API key.
 */
export const MCP_SERVER_ARGS = ['-y', '--package=pixelmuse', 'pixelmuse-mcp'] as const

const HOME = homedir()

interface EditorTarget {
  name: string
  id: string
  configPath: string
  /** Path whose presence means the editor is installed. */
  detectPath: string
}

const EDITORS: EditorTarget[] = [
  {
    name: 'Claude Code',
    id: 'claude-code',
    configPath: join(HOME, '.claude.json'),
    detectPath: join(HOME, '.claude'),
  },
  {
    name: 'Cursor',
    id: 'cursor',
    configPath: join(HOME, '.cursor', 'mcp.json'),
    detectPath: join(HOME, '.cursor'),
  },
  {
    name: 'Windsurf',
    id: 'windsurf',
    configPath: join(HOME, '.codeium', 'windsurf', 'mcp_config.json'),
    detectPath: join(HOME, '.codeium', 'windsurf'),
  },
]

/** Editor config paths the setup wizard can update. */
export function listEditorTargets(): Array<Omit<EditorInfo, 'installed'>> {
  return EDITORS.map(({ name, id, configPath }) => ({ name, id, configPath }))
}

/** Detect which AI editors have config directories present */
export function detectEditors(): EditorInfo[] {
  return EDITORS.map((editor) => ({
    name: editor.name,
    id: editor.id,
    configPath: editor.configPath,
    installed: existsSync(editor.detectPath) || existsSync(editor.configPath),
  }))
}

/** Add pixelmuse MCP server entry to an editor's config */
export function configureMcp(editor: EditorInfo, apiKey: string): void {
  const entry: McpServerEntry = {
    command: 'npx',
    args: [...MCP_SERVER_ARGS],
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
}

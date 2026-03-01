import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  entry: ['src/cli.ts', 'src/tui.tsx', 'src/mcp/server.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
  external: ['keyring-node'],
  define: { 'process.env.CLI_VERSION': JSON.stringify(version) },
})

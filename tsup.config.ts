import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts', 'src/tui.tsx', 'src/mcp/server.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
  external: ['keyring-node'],
})

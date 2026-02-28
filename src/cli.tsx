import React from 'react'
import { render } from 'ink'
import meow from 'meow'
import App from './app.js'
import type { Route } from './hooks/useRouter.js'
import type { PreviewPayload } from './screens/Generate.js'
import { renderImageDirect } from './lib/image.js'

const cli = meow(
  `
  Usage
    $ pixelmuse                  Interactive TUI
    $ pixelmuse generate <prompt>   Generate an image
    $ pixelmuse gallery             Browse your generations
    $ pixelmuse models              View available models
    $ pixelmuse prompts             Manage prompt templates
    $ pixelmuse account             View account & credits
    $ pixelmuse login               Authenticate
    $ pixelmuse logout              Remove credentials

  Options
    -m, --model          Model ID (e.g. nano-banana-2)
    -a, --aspect-ratio   Aspect ratio (e.g. 16:9)
    -s, --style          Style (realistic, anime, artistic, none)
    --no-preview         Skip image preview
    --json               Output JSON (for scripting)

  Examples
    $ pixelmuse generate "a cat in space" -m nano-banana-2 -a 16:9
    $ pixelmuse gallery
    $ pixelmuse models
`,
  {
    importMeta: import.meta,
    flags: {
      model: { type: 'string', shortFlag: 'm' },
      aspectRatio: { type: 'string', shortFlag: 'a' },
      style: { type: 'string', shortFlag: 's' },
      preview: { type: 'boolean', default: true },
      json: { type: 'boolean', default: false },
    },
  },
)

const [subcommand, ...rest] = cli.input

function resolveRoute(): Route {
  switch (subcommand) {
    case 'generate':
      return {
        screen: 'generate',
        prompt: rest.join(' ') || undefined,
        model: cli.flags.model,
        aspectRatio: cli.flags.aspectRatio,
        style: cli.flags.style,
      }
    case 'gallery':
      return { screen: 'gallery' }
    case 'models':
      return { screen: 'models' }
    case 'prompts':
      return { screen: 'prompts' }
    case 'account':
      return { screen: 'account' }
    case 'login':
      return { screen: 'login' }
    case 'logout':
      // Handled separately
      return { screen: 'home' }
    default:
      return { screen: 'home' }
  }
}

// Handle logout immediately (no TUI needed)
if (subcommand === 'logout') {
  const { deleteApiKey } = await import('./auth/store.js')
  await deleteApiKey()
  console.log('Logged out successfully.')
  process.exit(0)
}

/** Render image preview outside Ink, then handle keybinds for next action */
function showPreview(payload: PreviewPayload): Promise<Route | null> {
  const { generation, imagePath } = payload

  // Render image directly to terminal (pixel-perfect, Ink is unmounted)
  if (imagePath) {
    renderImageDirect(imagePath)
  }

  // Print metadata
  console.log()
  console.log(
    `Model: \x1b[1m${generation.model}\x1b[0m | Credits: \x1b[32m${generation.credits_charged}\x1b[0m`,
  )
  if (imagePath) {
    console.log(`\x1b[2mSaved to ${imagePath}\x1b[0m`)
  }
  console.log()
  console.log('\x1b[90m[r] regenerate | [g] gallery | [h] home | [q] quit\x1b[0m')

  // Listen for single keypress
  return new Promise((resolve) => {
    const { stdin } = process
    const wasRaw = stdin.isRaw
    stdin.setRawMode(true)
    stdin.resume()

    const handler = (data: Buffer) => {
      const key = data.toString()
      stdin.setRawMode(wasRaw ?? false)
      stdin.removeListener('data', handler)
      stdin.pause()

      switch (key) {
        case 'r':
          resolve({ screen: 'generate' })
          break
        case 'g':
          resolve({ screen: 'gallery' })
          break
        case 'h':
          resolve({ screen: 'home' })
          break
        default:
          resolve(null) // quit
      }
    }

    stdin.on('data', handler)
  })
}

/** Main app loop — re-launches Ink when navigating back from preview */
async function main() {
  let route: Route | null = resolveRoute()

  while (route) {
    const instance = render(<App initialRoute={route} />)
    await instance.waitUntilExit()

    // Check if we exited with a preview payload
    const payload = (globalThis as Record<string, unknown>).__pixelmuse_preview as
      | PreviewPayload
      | undefined
    delete (globalThis as Record<string, unknown>).__pixelmuse_preview

    if (payload?.type === 'preview') {
      route = await showPreview(payload)
    } else {
      route = null
    }
  }
}

main()

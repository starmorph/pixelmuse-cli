import React from 'react'
import { render } from 'ink'
import meow from 'meow'
import App from './app.js'
import type { Route } from './hooks/useRouter.js'

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

const initialRoute = resolveRoute()
render(<App initialRoute={initialRoute} />)

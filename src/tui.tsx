import React from 'react'
import { render } from 'ink'
import App from './app.js'
import type { Route } from './hooks/useRouter.js'
import type { PreviewPayload } from './screens/Generate.js'
import chalk from 'chalk'
import { renderImageDirect } from './core/image.js'

/** Render image preview outside Ink, then handle keybinds for next action */
function showPreview(payload: PreviewPayload): Promise<Route | null> {
  const { generation, imagePath } = payload

  if (imagePath) {
    renderImageDirect(imagePath)
  }

  console.log()
  console.log(`Model: ${chalk.bold(generation.model)} | Credits: ${chalk.green(String(generation.credits_charged))}`)
  if (imagePath) {
    console.log(chalk.gray(`Saved to ${imagePath}`))
  }
  console.log()
  console.log(chalk.gray('[r] regenerate | [g] gallery | [h] home | [q] quit'))

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
          resolve(null)
      }
    }

    stdin.on('data', handler)
  })
}

/** Launch the interactive TUI with an optional initial route */
export async function launchTui(initialRoute: Route = { screen: 'home' }): Promise<void> {
  let route: Route | null = initialRoute

  while (route) {
    const instance = render(<App initialRoute={route} />)
    await instance.waitUntilExit()

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

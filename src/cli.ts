import meow from 'meow'
import chalk from 'chalk'
import ora from 'ora'
import { readFileSync, watchFile, unwatchFile } from 'node:fs'
import { resolve } from 'node:path'
import {
  PixelmuseClient,
  generateImage,
  getApiKey,
  saveApiKey,
  deleteApiKey,
  isValidKeyFormat,
  readSettings,
  renderImageDirect,
  listTemplates,
  getTemplate,
  saveTemplate,
  interpolate,
  extractVariables,
  slugify,
  type Model,
  type AspectRatio,
  type Style,
  type PromptTemplate,
  timeAgo,
} from './core/index.js'

const cli = meow(
  `
  ${chalk.bold('Usage')}
    $ pixelmuse "prompt"                     Generate with defaults
    $ pixelmuse "prompt" -o hero.png         Save to specific path
    $ pixelmuse "prompt" -m nano-banana-pro  Choose model
    $ pixelmuse --json "prompt"              Machine-readable output
    $ echo "prompt" | pixelmuse             Pipe from stdin

  ${chalk.bold('Commands')}
    pixelmuse models                         List available models
    pixelmuse account                        View balance & usage
    pixelmuse history                        Recent generations
    pixelmuse open <id>                      Open generation in viewer
    pixelmuse login                          Authenticate
    pixelmuse logout                         Remove credentials
    pixelmuse ui                             Launch interactive TUI
    pixelmuse template <list|use|init|show>  Manage prompt templates

  ${chalk.bold('Options')}
    -m, --model          Model ID (default: nano-banana-2)
    -a, --aspect-ratio   Aspect ratio (default: 1:1)
    -s, --style          Style: realistic, anime, artistic, none
    -o, --output         Output file path
    --json               Output JSON (for scripting)
    --no-preview         Skip image preview
    --open               Open result in system viewer
    --watch <file>       Watch a prompt file and regenerate on save
    --no-save            Don't save image to disk
    --clipboard          Copy image to clipboard
    -h, --help           Show this help
    -v, --version        Show version

  ${chalk.bold('Examples')}
    $ pixelmuse "astronaut riding a horse"
    $ pixelmuse "app icon, minimal" -a 1:1 -o icon.png
    $ pixelmuse --watch prompt.txt -o output.png
    $ pixelmuse template use blog-thumbnail --var subject="React hooks"
`,
  {
    importMeta: import.meta,
    flags: {
      model: { type: 'string', shortFlag: 'm' },
      aspectRatio: { type: 'string', shortFlag: 'a' },
      style: { type: 'string', shortFlag: 's' },
      output: { type: 'string', shortFlag: 'o' },
      json: { type: 'boolean', default: false },
      preview: { type: 'boolean', default: true },
      open: { type: 'boolean', default: false },
      watch: { type: 'string' },
      save: { type: 'boolean', default: true },
      clipboard: { type: 'boolean', default: false },
      var: { type: 'string', isMultiple: true },
    },
  },
)

const [subcommand, ...rest] = cli.input

/** Read prompt from stdin if piped */
async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf-8').trim() || null
}

/** Require an authenticated client, exit with message if not */
async function requireClient(): Promise<PixelmuseClient> {
  const key = await getApiKey()
  if (!key) {
    console.error(chalk.red('Not authenticated. Run: pixelmuse login'))
    process.exit(1)
  }
  return new PixelmuseClient(key)
}

/** Copy image to clipboard */
async function copyToClipboard(imagePath: string): Promise<boolean> {
  const { execSync } = await import('node:child_process')
  try {
    if (process.platform === 'darwin') {
      execSync(`osascript -e 'set the clipboard to (read (POSIX file "${imagePath}") as TIFF picture)'`)
    } else {
      execSync(`xclip -selection clipboard -t image/png -i "${imagePath}"`)
    }
    return true
  } catch {
    return false
  }
}

// ── Generate command (default) ─────────────────────────────────────────

async function handleGenerate(prompt: string) {
  const client = await requireClient()
  const settings = readSettings()

  const model = (cli.flags.model ?? settings.defaultModel) as Model
  const aspectRatio = (cli.flags.aspectRatio ?? settings.defaultAspectRatio) as AspectRatio
  const style = (cli.flags.style ?? settings.defaultStyle) as Style

  // Fetch balance for cost display
  let balance: number | null = null
  let creditCost: number | null = null
  try {
    const [account, models] = await Promise.all([
      client.getAccount(),
      PixelmuseClient.listModels(),
    ])
    balance = account.credits.total
    creditCost = models.find((m) => m.id === model)?.credit_cost ?? null
  } catch {
    // Non-critical — proceed without cost info
  }

  // JSON mode: no spinners, no color
  if (cli.flags.json) {
    try {
      const result = await generateImage(client, {
        prompt,
        model,
        aspectRatio,
        style,
        output: cli.flags.output,
        noSave: !cli.flags.save,
      })
      console.log(
        JSON.stringify({
          id: result.generation.id,
          status: result.generation.status,
          model: result.generation.model,
          prompt: result.generation.prompt,
          credits_charged: result.generation.credits_charged,
          elapsed_seconds: Math.round(result.elapsed * 10) / 10,
          output_path: result.imagePath,
        }),
      )
    } catch (err) {
      console.error(JSON.stringify({ error: err instanceof Error ? err.message : 'Generation failed' }))
      process.exit(1)
    }
    return
  }

  // Interactive mode with spinner
  const costStr = creditCost !== null ? `${creditCost} credit${creditCost > 1 ? 's' : ''}` : ''
  const balStr = balance !== null ? ` (balance: ${balance})` : ''
  const spinner = ora(`${chalk.bold(model)} · ${costStr}${balStr} — generating...`).start()

  try {
    const result = await generateImage(client, {
      prompt,
      model,
      aspectRatio,
      style,
      output: cli.flags.output,
      noSave: !cli.flags.save,
      onProgress: (elapsed) => {
        spinner.text = `${chalk.bold(model)} · ${costStr}${balStr} — generating... ${chalk.gray(`${elapsed.toFixed(1)}s`)}`
      },
    })

    const charged = result.generation.credits_charged
    const remaining = balance !== null ? balance - charged : null
    const remainStr = remaining !== null ? ` (remaining: ${remaining})` : ''

    spinner.succeed(
      `Generated in ${result.elapsed.toFixed(1)}s · ${charged} credit${charged > 1 ? 's' : ''} charged${remainStr}`,
    )

    if (result.imagePath) {
      console.log(chalk.gray(`  Saved to ${result.imagePath}`))
    }

    // Preview
    if (cli.flags.preview && result.imagePath) {
      const previewed = renderImageDirect(result.imagePath)
      if (!previewed) console.log(chalk.gray('  Install chafa for terminal image preview'))
    }

    // Clipboard
    if (cli.flags.clipboard && result.imagePath) {
      const ok = await copyToClipboard(result.imagePath)
      if (ok) console.log(chalk.gray('  Copied to clipboard'))
    }

    // Open in viewer
    if (cli.flags.open && result.imagePath) {
      const { default: open } = await import('open')
      await open(result.imagePath)
    }
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : 'Generation failed')
    process.exit(1)
  }
}

// ── Watch mode ─────────────────────────────────────────────────────────

async function handleWatch(filePath: string) {
  const absPath = resolve(filePath)
  const client = await requireClient()
  const settings = readSettings()

  console.log(chalk.cyan(`Watching ${absPath} for changes... (Ctrl+C to stop)`))

  let generating = false

  const generate = async () => {
    if (generating) return
    generating = true

    const prompt = readFileSync(absPath, 'utf-8').trim()
    if (!prompt) {
      generating = false
      return
    }

    const model = (cli.flags.model ?? settings.defaultModel) as Model
    const aspectRatio = (cli.flags.aspectRatio ?? settings.defaultAspectRatio) as AspectRatio
    const style = (cli.flags.style ?? settings.defaultStyle) as Style
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })

    const spinner = ora(`[${time}] Generating... (${model})`).start()

    try {
      const result = await generateImage(client, {
        prompt,
        model,
        aspectRatio,
        style,
        output: cli.flags.output,
      })
      spinner.succeed(`[${time}] Saved to ${result.imagePath} (${result.elapsed.toFixed(1)}s)`)
    } catch (err) {
      spinner.fail(`[${time}] ${err instanceof Error ? err.message : 'Failed'}`)
    }

    generating = false
  }

  // Initial generate
  await generate()

  // Watch for changes
  watchFile(absPath, { interval: 500 }, generate)

  // Keep alive
  process.on('SIGINT', () => {
    unwatchFile(absPath)
    console.log(chalk.gray('\nStopped watching.'))
    process.exit(0)
  })

  // Prevent exit
  await new Promise(() => {})
}

// ── Models command ─────────────────────────────────────────────────────

async function handleModels() {
  const spinner = ora('Loading models...').start()
  try {
    const models = await PixelmuseClient.listModels()
    spinner.stop()

    const nameW = 22
    const costW = 10
    console.log(
      chalk.bold('Model'.padEnd(nameW)) +
        chalk.bold('Credits'.padEnd(costW)) +
        chalk.bold('Best For'),
    )
    console.log(chalk.gray('─'.repeat(70)))

    for (const m of models) {
      const cost = m.credit_cost > 1 ? chalk.yellow(String(m.credit_cost)) : chalk.green(String(m.credit_cost))
      console.log(
        m.name.padEnd(nameW) +
          cost.padEnd(costW + (cost.length - String(m.credit_cost).length)) +
          chalk.gray(m.strengths.join(', ')),
      )
    }
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : 'Failed to load models')
    process.exit(1)
  }
}

// ── Account command ────────────────────────────────────────────────────

async function handleAccount() {
  const client = await requireClient()
  const spinner = ora('Loading account...').start()

  try {
    const account = await client.getAccount()
    spinner.stop()

    console.log(`${chalk.bold('Email:')}    ${account.email}`)
    console.log(`${chalk.bold('Plan:')}     ${chalk.cyan(account.plan)}`)
    console.log(
      `${chalk.bold('Credits:')}  ${chalk.green(String(account.credits.total))} (${account.credits.subscription} subscription + ${account.credits.purchased} purchased)`,
    )
    console.log(`${chalk.bold('Rate:')}     ${account.rate_limit.requests_per_minute} req/min`)
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : 'Failed to load account')
    process.exit(1)
  }
}

// ── History command ────────────────────────────────────────────────────

async function handleHistory() {
  const client = await requireClient()
  const spinner = ora('Loading history...').start()

  try {
    const result = await client.listGenerations({ limit: 20 })
    spinner.stop()

    if (result.data.length === 0) {
      console.log('No generations yet.')
      return
    }

    const idW = 18
    const modelW = 22
    const promptW = 34
    console.log(
      chalk.bold('ID'.padEnd(idW)) +
        chalk.bold('Model'.padEnd(modelW)) +
        chalk.bold('Prompt'.padEnd(promptW)) +
        chalk.bold('Date'),
    )
    console.log(chalk.gray('─'.repeat(90)))

    for (const gen of result.data) {
      const id = gen.id.slice(0, 15) + '...'
      const prompt = gen.prompt.length > 30 ? gen.prompt.slice(0, 30) + '...' : gen.prompt
      const date = timeAgo(new Date(gen.created_at))
      const status = gen.status === 'succeeded' ? chalk.green('●') : gen.status === 'failed' ? chalk.red('✗') : chalk.yellow('◌')

      console.log(
        chalk.gray(id.padEnd(idW)) +
          `${status} ${gen.model}`.padEnd(modelW + status.length - 1) +
          prompt.padEnd(promptW) +
          chalk.gray(date),
      )
    }
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : 'Failed to load history')
    process.exit(1)
  }
}

// ── Open command ───────────────────────────────────────────────────────

async function handleOpen(id: string) {
  const client = await requireClient()
  const spinner = ora('Loading generation...').start()

  try {
    const gen = await client.getGeneration(id)
    spinner.stop()

    if (gen.output?.[0]) {
      const { imageToBuffer, saveImage } = await import('./core/image.js')
      const { PATHS } = await import('./core/config.js')
      const { join } = await import('node:path')

      const buf = await imageToBuffer(gen.output[0])
      const path = join(PATHS.generations, `${gen.id}.png`)
      saveImage(buf, path)

      const { default: open } = await import('open')
      await open(path)
      console.log(`Opened ${path}`)
    } else {
      console.log(`Generation ${id} has no output (status: ${gen.status})`)
    }
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : 'Failed')
    process.exit(1)
  }
}

// ── Login command ──────────────────────────────────────────────────────

async function handleLogin() {
  const { createInterface } = await import('node:readline')
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  const key = await new Promise<string>((resolve) => {
    rl.question('API key (from pixelmuse.studio/developers): ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })

  if (!isValidKeyFormat(key)) {
    console.error(chalk.red('Invalid key format. Keys start with pm_live_ or pm_test_'))
    process.exit(1)
  }

  const spinner = ora('Validating...').start()
  try {
    const client = new PixelmuseClient(key)
    const account = await client.getAccount()
    await saveApiKey(key)
    spinner.succeed(`Authenticated as ${chalk.bold(account.email)} (${chalk.green(`${account.credits.total} credits`)})`)
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : 'Authentication failed')
    process.exit(1)
  }
}

// ── Template commands ──────────────────────────────────────────────────

async function handleTemplate() {
  const [, templateCmd, ...templateArgs] = cli.input

  switch (templateCmd) {
    case 'list': {
      const templates = listTemplates()
      if (templates.length === 0) {
        console.log('No templates. Create one with: pixelmuse template init <name>')
        return
      }
      for (const t of templates) {
        console.log(`${chalk.bold(t.name)} ${chalk.gray(`— ${t.description}`)}`)
        if (t.tags.length > 0) console.log(chalk.gray(`  tags: ${t.tags.join(', ')}`))
      }
      break
    }

    case 'show': {
      const name = templateArgs.join(' ')
      if (!name) {
        console.error(chalk.red('Usage: pixelmuse template show <name>'))
        process.exit(1)
      }
      const template = getTemplate(name)
      if (!template) {
        console.error(chalk.red(`Template "${name}" not found`))
        process.exit(1)
      }
      console.log(chalk.bold(template.name))
      console.log(chalk.gray(template.description))
      console.log(`\n${chalk.bold('Prompt:')} ${template.prompt}`)
      const vars = extractVariables(template.prompt)
      if (vars.length > 0) {
        console.log(`${chalk.bold('Variables:')} ${vars.join(', ')}`)
        for (const [k, v] of Object.entries(template.variables)) {
          console.log(chalk.gray(`  ${k} = "${v}"`))
        }
      }
      if (template.defaults.model) console.log(`${chalk.bold('Model:')} ${template.defaults.model}`)
      if (template.defaults.aspect_ratio) console.log(`${chalk.bold('Aspect:')} ${template.defaults.aspect_ratio}`)
      break
    }

    case 'init': {
      const name = templateArgs.join(' ')
      if (!name) {
        console.error(chalk.red('Usage: pixelmuse template init <name>'))
        process.exit(1)
      }
      const existing = getTemplate(name)
      if (existing) {
        console.error(chalk.red(`Template "${name}" already exists`))
        process.exit(1)
      }
      const template: PromptTemplate = {
        name,
        description: `${name} template`,
        prompt: 'A {{subject}} with dramatic lighting',
        defaults: { model: 'nano-banana-2', aspect_ratio: '16:9' },
        variables: { subject: 'landscape' },
        tags: [],
      }
      saveTemplate(template)
      const { PATHS } = await import('./core/config.js')
      const path = `${PATHS.prompts}/${slugify(name)}.yaml`
      console.log(`Created template: ${chalk.bold(path)}`)
      console.log(chalk.gray('Edit the YAML file to customize your template.'))
      break
    }

    case 'use': {
      const name = templateArgs.join(' ')
      if (!name) {
        console.error(chalk.red('Usage: pixelmuse template use <name> [--var key=value]'))
        process.exit(1)
      }
      const template = getTemplate(name)
      if (!template) {
        console.error(chalk.red(`Template "${name}" not found`))
        process.exit(1)
      }

      // Parse --var flags
      const vars: Record<string, string> = { ...template.variables }
      for (const v of cli.flags.var ?? []) {
        const eq = v.indexOf('=')
        if (eq > 0) {
          vars[v.slice(0, eq)] = v.slice(eq + 1)
        }
      }

      const prompt = interpolate(template.prompt, vars)
      // Override flags with template defaults
      if (template.defaults.model && !cli.flags.model) {
        cli.flags.model = template.defaults.model
      }
      if (template.defaults.aspect_ratio && !cli.flags.aspectRatio) {
        cli.flags.aspectRatio = template.defaults.aspect_ratio
      }
      if (template.defaults.style && !cli.flags.style) {
        cli.flags.style = template.defaults.style
      }

      await handleGenerate(prompt)
      break
    }

    default:
      console.log(`Usage: pixelmuse template <list|show|init|use> [name]`)
      break
  }
}

// ── Main router ────────────────────────────────────────────────────────

async function main() {
  // Handle stdin pipe
  const stdinPrompt = await readStdin()

  switch (subcommand) {
    case 'models':
      return handleModels()

    case 'account':
      return handleAccount()

    case 'history':
      return handleHistory()

    case 'open':
      if (!rest[0]) {
        console.error(chalk.red('Usage: pixelmuse open <generation-id>'))
        process.exit(1)
      }
      return handleOpen(rest[0])

    case 'login':
      return handleLogin()

    case 'logout':
      await deleteApiKey()
      console.log('Logged out.')
      return

    case 'template':
      return handleTemplate()

    case 'ui': {
      const { launchTui } = await import('./tui.js')
      return launchTui()
    }

    // Explicit generate or default with prompt
    case 'generate': {
      const prompt = rest.join(' ') || stdinPrompt
      if (!prompt) {
        console.error(chalk.red('Usage: pixelmuse generate "your prompt"'))
        process.exit(1)
      }
      if (cli.flags.watch) return handleWatch(cli.flags.watch)
      return handleGenerate(prompt)
    }

    default: {
      // Default: treat everything as a prompt
      const prompt = cli.input.join(' ') || stdinPrompt
      if (!prompt) {
        // No args, no stdin → show help or launch TUI
        if (process.stdin.isTTY) {
          cli.showHelp()
        }
        return
      }
      if (cli.flags.watch) return handleWatch(cli.flags.watch)
      return handleGenerate(prompt)
    }
  }
}

main().catch((err) => {
  console.error(chalk.red(err instanceof Error ? err.message : 'Fatal error'))
  process.exit(1)
})

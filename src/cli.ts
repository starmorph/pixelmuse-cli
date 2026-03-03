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
  writeSettings,
  renderImageDirect,
  listTemplates,
  getTemplate,
  saveTemplate,
  interpolate,
  extractVariables,
  slugify,
  initiateDeviceAuth,
  pollForToken,
  detectEditors,
  configureMcp,
  ApiError,
  type Model,
  type AspectRatio,
  type Style,
  type PromptTemplate,
  type Settings,
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
    pixelmuse setup                          First-time setup wizard
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
    --public             Make image public (default: private)
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
      public: { type: 'boolean', default: false },
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
    if (cli.flags.json) {
      console.error(JSON.stringify({ error: 'Not authenticated. Run: pixelmuse login' }))
    } else {
      console.error(chalk.red('Not authenticated. Run: pixelmuse login'))
    }
    process.exit(1)
  }
  return new PixelmuseClient(key)
}

/** Copy image to clipboard */
async function copyToClipboard(imagePath: string): Promise<boolean> {
  const { execFileSync } = await import('node:child_process')
  try {
    if (process.platform === 'darwin') {
      execFileSync('osascript', ['-e', `set the clipboard to (read (POSIX file "${imagePath}") as TIFF picture)`])
    } else {
      execFileSync('xclip', ['-selection', 'clipboard', '-t', 'image/png', '-i', imagePath])
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
  const visibility = cli.flags.public ? 'public' as const : settings.defaultVisibility

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
        visibility,
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
          visibility: result.generation.visibility,
          elapsed_seconds: Math.round(result.elapsed * 10) / 10,
          output_path: result.imagePath,
        }),
      )
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 402) {
          console.error(JSON.stringify({ error: err.message, status: 402, code: 'INSUFFICIENT_CREDITS', buy_url: 'https://www.pixelmuse.studio/get-credits' }))
        } else {
          console.error(JSON.stringify({ error: err.message, status: err.status, code: err.code }))
        }
        process.exit(1)
      }
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Generation failed'
      console.error(JSON.stringify({ error: msg }))
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
      visibility,
      output: cli.flags.output,
      noSave: !cli.flags.save,
      onProgress: (elapsed) => {
        spinner.text = `${chalk.bold(model)} · ${costStr}${balStr} — generating... ${chalk.gray(`${elapsed.toFixed(1)}s`)}`
      },
    })

    const charged = result.generation.credits_charged
    const remaining = balance !== null ? balance - charged : null
    const remainStr = remaining !== null ? ` (remaining: ${remaining})` : ''

    const visLabel = result.generation.visibility === 'public' ? chalk.green('public') : chalk.gray('private')
    spinner.succeed(
      `Generated in ${result.elapsed.toFixed(1)}s · ${charged} credit${charged > 1 ? 's' : ''} charged${remainStr} · ${visLabel}`,
    )

    if (result.imagePath) {
      console.log(chalk.gray(`  Saved to ${result.imagePath}`))
    }

    if (result.generation.visibility === 'public') {
      console.log(chalk.cyan(`  View: https://www.pixelmuse.studio/g/${result.generation.id}`))
    }

    // Post-generation tips
    settings.generationCount++
    writeSettings(settings)
    if (settings.generationCount === 1) {
      console.log(chalk.gray('  Tip: try pixelmuse ui for interactive mode'))
    } else if (settings.generationCount === 2) {
      console.log(chalk.gray('  Tip: pixelmuse template init my-template — save reusable prompts'))
    } else if (settings.generationCount === 3) {
      console.log(chalk.gray('  Tip: pixelmuse --watch prompt.txt — auto-regenerate on save'))
    }

    // Preview
    if (cli.flags.preview && result.imagePath) {
      const previewed = renderImageDirect(result.imagePath)
      if (!previewed) console.log(chalk.gray('  Install chafa for terminal image preview'))
    }

    // Clipboard
    if (cli.flags.clipboard && result.imagePath) {
      const ok = await copyToClipboard(result.imagePath)
      if (ok) {
        console.log(chalk.gray('  Copied to clipboard'))
      } else {
        console.log(chalk.gray('  Clipboard failed — install xclip (X11) or wl-copy (Wayland)'))
      }
    }

    // Open in viewer
    if (cli.flags.open && result.imagePath) {
      const { default: open } = await import('open')
      await open(result.imagePath)
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 402) {
        spinner.fail('Insufficient credits')
        console.log(chalk.yellow(`  Buy credits: ${chalk.underline('https://www.pixelmuse.studio/get-credits')}`))
        console.log(chalk.gray(`  Or try a 1-credit model: pixelmuse "prompt" -m nano-banana-2`))
        process.exit(1)
      }
      if (err.status === 401) {
        spinner.fail('API key invalid or expired. Run: pixelmuse login')
        process.exit(1)
      }
      if (err.status === 429) {
        const wait = err.retryAfter ? ` Wait ${err.retryAfter}s.` : ''
        spinner.fail(`Rate limited.${wait} Upgrade plan for higher limits.`)
        process.exit(1)
      }
      if (err.status === 500) {
        spinner.fail('Server error — the image provider may be temporarily down. Try again in a moment.')
        process.exit(1)
      }
      if (err.status === 503) {
        spinner.fail('Service temporarily unavailable. Try again in a few seconds.')
        process.exit(1)
      }
      spinner.fail(err.message)
      process.exit(1)
    }
    const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Generation failed'
    spinner.fail(msg)
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
  let dirty = false

  const generate = async () => {
    if (generating) {
      dirty = true
      return
    }
    generating = true

    let prompt: string
    try {
      prompt = readFileSync(absPath, 'utf-8').trim()
    } catch {
      generating = false
      return
    }
    if (!prompt) {
      generating = false
      return
    }

    const model = (cli.flags.model ?? settings.defaultModel) as Model
    const aspectRatio = (cli.flags.aspectRatio ?? settings.defaultAspectRatio) as AspectRatio
    const style = (cli.flags.style ?? settings.defaultStyle) as Style
    const watchVisibility = cli.flags.public ? 'public' as const : settings.defaultVisibility
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })

    const spinner = ora(`[${time}] Generating... (${model})`).start()

    try {
      const result = await generateImage(client, {
        prompt,
        model,
        aspectRatio,
        style,
        visibility: watchVisibility,
        output: cli.flags.output,
      })
      spinner.succeed(`[${time}] Saved to ${result.imagePath} (${result.elapsed.toFixed(1)}s)`)
    } catch (err) {
      spinner.fail(`[${time}] ${err instanceof Error ? err.message : 'Failed'}`)
    }

    generating = false
    if (dirty) {
      dirty = false
      generate()
    }
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

    const idW = 40
    const modelW = 22
    const promptW = 34
    console.log(
      chalk.bold('ID'.padEnd(idW)) +
        chalk.bold('Model'.padEnd(modelW)) +
        chalk.bold('Prompt'.padEnd(promptW)) +
        chalk.bold('Date'),
    )
    console.log(chalk.gray('─'.repeat(110)))

    for (const gen of result.data) {
      const id = gen.id
      const prompt = gen.prompt.length > 30 ? gen.prompt.slice(0, 30) + '...' : gen.prompt
      const date = timeAgo(new Date(gen.created_at))
      const status = gen.status === 'succeeded' ? chalk.green('●') : gen.status === 'failed' ? chalk.red('✗') : chalk.yellow('◌')
      const vis = gen.visibility === 'private' ? chalk.gray(' 🔒') : ''

      console.log(
        chalk.gray(id.padEnd(idW)) +
          `${status} ${gen.model}${vis}`.padEnd(modelW + status.length - 1 + vis.length) +
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

async function handleLogin(): Promise<string> {
  console.log(chalk.bold('Pixelmuse Login'))
  console.log()

  const spinner = ora('Preparing login...').start()

  try {
    const init = await initiateDeviceAuth()
    spinner.stop()

    console.log(`  Your code: ${chalk.bold.cyan(init.userCode)}`)
    console.log()
    console.log(`  Opening ${chalk.underline(init.verificationUriComplete)}`)
    console.log(`  ${chalk.gray('Or visit')} ${chalk.underline(init.verificationUri)} ${chalk.gray('and enter the code manually')}`)
    console.log()

    const { default: open } = await import('open')
    await open(init.verificationUriComplete)

    const pollSpinner = ora('Waiting for authorization...').start()
    let dots = 0

    const result = await pollForToken(init.deviceCode, {
      interval: init.interval,
      expiresIn: init.expiresIn,
      onPoll: () => {
        dots = (dots + 1) % 4
        pollSpinner.text = `Waiting for authorization${'.'.repeat(dots)}`
      },
    })

    await saveApiKey(result.apiKey)
    pollSpinner.stop()

    const client = new PixelmuseClient(result.apiKey)
    const account = await client.getAccount()
    console.log(chalk.green('✓') + ` Authenticated as ${chalk.bold(account.email)} (${chalk.green(`${account.credits.total} credits`)})`)

    return result.apiKey
  } catch (err) {
    spinner.stop()

    if (err instanceof Error && !err.message.includes('timed out') && !err.message.includes('denied')) {
      // Device flow not available — go straight to manual
      console.log(chalk.gray('Browser login unavailable. Enter your API key manually.'))
    } else if (err instanceof Error) {
      console.log(chalk.yellow(err.message))
    }

    return handleManualLogin()
  }
}

async function handleManualLogin(): Promise<string> {
  console.log()
  console.log(`  Get your key at: ${chalk.underline('https://www.pixelmuse.studio/settings/api-keys')}`)
  console.log()

  const { createInterface } = await import('node:readline')
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  const key = await new Promise<string>((resolve) => {
    rl.question('API key: ', (answer) => {
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
    return key
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : 'Authentication failed')
    process.exit(1)
  }
}

// ── Setup wizard ──────────────────────────────────────────────────────

async function handleSetup() {
  console.log()
  console.log(chalk.bold('  Pixelmuse Setup'))
  console.log(chalk.gray('  AI image generation from the terminal'))
  console.log()

  // Step 1: Auth
  const existingKey = await getApiKey()
  let apiKey: string

  if (existingKey) {
    const spinner = ora('Checking existing credentials...').start()
    try {
      const client = new PixelmuseClient(existingKey)
      const account = await client.getAccount()
      spinner.succeed(`Already authenticated as ${chalk.bold(account.email)} (${chalk.green(`${account.credits.total} credits`)})`)
      apiKey = existingKey
    } catch {
      spinner.warn('Existing credentials invalid. Re-authenticating...')
      apiKey = await handleLogin()
    }
  } else {
    console.log(chalk.bold('Step 1:') + ' Authenticate')
    console.log()
    apiKey = await handleLogin()
  }

  console.log()

  // Step 2: MCP configuration
  const editors = detectEditors()
  const available = editors.filter((e) => e.installed)

  if (available.length > 0) {
    console.log(chalk.bold('Step 2:') + ' MCP Server (AI agent integration)')
    console.log()

    const { createInterface } = await import('node:readline')

    for (const editor of available) {
      const rl = createInterface({ input: process.stdin, output: process.stdout })
      const answer = await new Promise<string>((resolve) => {
        rl.question(`  Configure ${chalk.bold(editor.name)}? ${chalk.gray('[Y/n]')} `, (a) => {
          rl.close()
          resolve(a.trim().toLowerCase())
        })
      })

      if (answer === '' || answer === 'y' || answer === 'yes') {
        try {
          configureMcp(editor, apiKey)
          console.log(chalk.green('  ✓') + ` ${editor.name} MCP configured`)
        } catch (err) {
          console.log(chalk.yellow('  ⚠') + ` ${editor.name}: ${err instanceof Error ? err.message : 'Configuration failed'}`)
        }
      } else {
        console.log(chalk.gray(`  Skipped ${editor.name}`))
      }
    }
    console.log()
  }

  // Step 3: Defaults
  console.log(chalk.bold(available.length > 0 ? 'Step 3:' : 'Step 2:') + ' Defaults')
  console.log()

  const { createInterface: createRl } = await import('node:readline')
  const rl = createRl({ input: process.stdin, output: process.stdout })
  const customize = await new Promise<string>((resolve) => {
    rl.question(`  Customize default model and settings? ${chalk.gray('[y/N]')} `, (a) => {
      rl.close()
      resolve(a.trim().toLowerCase())
    })
  })

  if (customize === 'y' || customize === 'yes') {
    const settings = readSettings()
    const updated: Partial<Settings> = {}

    const models = ['nano-banana-2', 'nano-banana-pro', 'flux-schnell', 'imagen-3', 'recraft-v4', 'recraft-v4-pro']
    const aspects = ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9']
    const styles = ['none', 'realistic', 'anime', 'artistic']

    const pick = async (label: string, options: string[], current: string): Promise<string> => {
      const { createInterface } = await import('node:readline')
      const rl2 = createInterface({ input: process.stdin, output: process.stdout })
      console.log(`  ${label}: ${options.map((o) => (o === current ? chalk.bold.cyan(o) : chalk.gray(o))).join(' | ')}`)
      const answer = await new Promise<string>((resolve) => {
        rl2.question(`  Choice ${chalk.gray(`[${current}]`)}: `, (a) => {
          rl2.close()
          resolve(a.trim() || current)
        })
      })
      return options.includes(answer) ? answer : current
    }

    updated.defaultModel = await pick('Model', models, settings.defaultModel)
    updated.defaultAspectRatio = await pick('Aspect ratio', aspects, settings.defaultAspectRatio)
    updated.defaultStyle = await pick('Style', styles, settings.defaultStyle)

    writeSettings({ ...settings, ...updated } as Settings)
    console.log(chalk.green('  ✓') + ' Defaults saved')
  } else {
    console.log(chalk.gray('  Using defaults (nano-banana-2, 1:1, no style)'))
  }

  // Summary
  console.log()
  console.log(chalk.green.bold('  Setup complete!'))
  console.log()
  console.log(`  Try it: ${chalk.cyan('pixelmuse "a cat floating through space"')}`)
  console.log(`  TUI:    ${chalk.cyan('pixelmuse ui')}`)
  console.log(`  Help:   ${chalk.cyan('pixelmuse --help')}`)
  console.log()

  console.log(chalk.bold('  Generating your first image...'))
  console.log()
  try {
    await handleGenerate('a cosmic fox surrounded by nebula colors, cinematic lighting')
  } catch {
    // Demo generation is non-critical
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

    case 'setup':
      return handleSetup()

    case 'login':
      await handleLogin()
      return

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
      if (cli.flags.watch) return handleWatch(cli.flags.watch)
      const stdinPrompt = await readStdin()
      const prompt = rest.join(' ') || stdinPrompt
      if (!prompt) {
        console.error(chalk.red('Usage: pixelmuse generate "your prompt"'))
        process.exit(1)
      }
      return handleGenerate(prompt)
    }

    default: {
      if (cli.flags.watch) return handleWatch(cli.flags.watch)
      // Default: treat everything as a prompt
      const stdinPrompt = await readStdin()
      const prompt = cli.input.join(' ') || stdinPrompt
      if (!prompt) {
        // No args, no stdin → show help or launch TUI
        if (process.stdin.isTTY) {
          cli.showHelp()
        }
        return
      }
      return handleGenerate(prompt)
    }
  }
}

main().catch((err) => {
  console.error(chalk.red(err instanceof Error ? err.message : 'Fatal error'))
  process.exit(1)
})

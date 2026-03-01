import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { PixelmuseClient, CLI_VERSION } from '../core/client.js'
import { generateImage } from '../core/generate.js'
import { getApiKey } from '../core/auth.js'
import { readSettings } from '../core/config.js'
import type { Model, AspectRatio, Style } from '../core/types.js'

const MODELS = [
  'nano-banana-2',
  'nano-banana-pro',
  'flux-schnell',
  'imagen-3',
  'recraft-v4',
  'recraft-v4-pro',
] as const

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '3:2', '2:3', '4:5', '5:4', '3:4', '4:3', '21:9', '9:21'] as const

const STYLES = ['none', 'realistic', 'anime', 'artistic'] as const

async function getClient(): Promise<PixelmuseClient> {
  const key = await getApiKey()
  if (!key) throw new Error('No API key found. Set PIXELMUSE_API_KEY environment variable.')
  return new PixelmuseClient(key)
}

const server = new McpServer({
  name: 'pixelmuse',
  version: CLI_VERSION,
})

// ── generate_image tool ────────────────────────────────────────────────

server.tool(
  'generate_image',
  'Generate an AI image using Pixelmuse. Returns the saved file path and generation metadata.',
  {
    prompt: z.string().describe('Image description / prompt'),
    model: z.enum(MODELS).optional().default('nano-banana-2').describe('Model to use'),
    aspect_ratio: z.enum(ASPECT_RATIOS).optional().default('1:1').describe('Image aspect ratio'),
    style: z.enum(STYLES).optional().default('none').describe('Visual style'),
    output_path: z.string().optional().describe('Where to save the image (default: current directory)'),
  },
  async (args) => {
    const client = await getClient()
    const settings = readSettings()

    const result = await generateImage(client, {
      prompt: args.prompt,
      model: (args.model ?? settings.defaultModel) as Model,
      aspectRatio: (args.aspect_ratio ?? settings.defaultAspectRatio) as AspectRatio,
      style: (args.style ?? settings.defaultStyle) as Style,
      output: args.output_path,
    })

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            id: result.generation.id,
            status: result.generation.status,
            model: result.generation.model,
            prompt: result.generation.prompt,
            credits_charged: result.generation.credits_charged,
            elapsed_seconds: Math.round(result.elapsed * 10) / 10,
            output_path: result.imagePath,
          }, null, 2),
        },
      ],
    }
  },
)

// ── list_models tool ───────────────────────────────────────────────────

server.tool(
  'list_models',
  'List all available Pixelmuse image generation models with their costs and capabilities.',
  {},
  async () => {
    const models = await PixelmuseClient.listModels()
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            models.map((m) => ({
              id: m.id,
              name: m.name,
              credit_cost: m.credit_cost,
              strengths: m.strengths,
              supported_aspect_ratios: m.supported_aspect_ratios,
            })),
            null,
            2,
          ),
        },
      ],
    }
  },
)

// ── check_balance tool ─────────────────────────────────────────────────

server.tool(
  'check_balance',
  'Check Pixelmuse account credit balance and plan info.',
  {},
  async () => {
    const client = await getClient()
    const account = await client.getAccount()
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            email: account.email,
            plan: account.plan,
            credits_total: account.credits.total,
            credits_subscription: account.credits.subscription,
            credits_purchased: account.credits.purchased,
            rate_limit: account.rate_limit.requests_per_minute,
          }, null, 2),
        },
      ],
    }
  },
)

// ── Start server ───────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('MCP server error:', err)
  process.exit(1)
})

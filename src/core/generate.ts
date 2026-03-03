import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { PixelmuseClient } from './client.js'
import { pollGeneration } from './polling.js'
import { imageToBuffer, saveImage, autoSave } from './image.js'
import { slugify } from './prompts.js'
import type { Model, AspectRatio, Style, Visibility, Generation } from './types.js'

export interface GenerateOptions {
  prompt: string
  model?: Model
  aspectRatio?: AspectRatio
  style?: Style
  visibility?: Visibility
  /** Explicit output path. If omitted, saves to cwd with slugified prompt name */
  output?: string
  /** Skip saving to disk entirely */
  noSave?: boolean
  /** Progress callback for UI updates */
  onProgress?: (elapsed: number, progress: number) => void
}

export interface GenerateResult {
  generation: Generation
  /** Path where the image was saved (null if noSave) */
  imagePath: string | null
  /** Time taken in seconds */
  elapsed: number
}

/** Resolve output path: explicit -o flag, or cwd + slugified prompt */
function resolveOutputPath(prompt: string, output?: string): string {
  if (output) return resolve(output)

  const base = slugify(prompt).slice(0, 60) || 'generation'
  let filename = `${base}.png`
  let counter = 2

  // Avoid overwriting existing files
  while (existsSync(join(process.cwd(), filename))) {
    filename = `${base}-${counter}.png`
    counter++
  }

  return join(process.cwd(), filename)
}

/** Generate an image end-to-end: API call → poll → save */
export async function generateImage(
  client: PixelmuseClient,
  options: GenerateOptions,
): Promise<GenerateResult> {
  const {
    prompt,
    model = 'nano-banana-2',
    aspectRatio = '1:1',
    style,
    visibility,
    output,
    noSave = false,
    onProgress,
  } = options

  const start = Date.now()

  // Generate
  let gen = await client.generate({
    prompt,
    model,
    aspect_ratio: aspectRatio,
    style: style === 'none' ? undefined : style,
    visibility,
  })

  if (gen.status === 'failed') {
    throw new Error(gen.error ?? 'Generation failed')
  }

  // Poll if async (Replicate models)
  if (gen.status === 'processing' || gen.status === 'pending') {
    gen = await pollGeneration(client, gen.id, { onProgress })
  }

  const elapsed = (Date.now() - start) / 1000
  let imagePath: string | null = null

  if (gen.output?.[0] && !noSave) {
    const buf = await imageToBuffer(gen.output[0])

    // Save to explicit output or cwd
    const outPath = resolveOutputPath(prompt, output)
    saveImage(buf, outPath)
    imagePath = outPath

    // Also save to generations dir for history
    autoSave(gen.id, buf)
  }

  return { generation: gen, imagePath, elapsed }
}

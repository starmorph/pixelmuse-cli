import type { PixelmuseClient } from './client.js'
import type { Generation } from './types.js'

/** Typical generation durations by model family (seconds) */
const TYPICAL_DURATIONS: Record<string, number> = {
  'flux-schnell': 12,
  'recraft-v4': 20,
  'recraft-v4-pro': 25,
}

interface PollOptions {
  /** Initial poll interval in ms (default 2000) */
  interval?: number
  /** Max wait time in ms (default 120000) */
  timeout?: number
  /** Progress callback: elapsed seconds and estimated 0-1 progress */
  onProgress?: (elapsed: number, estimatedProgress: number) => void
}

/** Poll a generation until it completes or fails */
export async function pollGeneration(
  client: PixelmuseClient,
  id: string,
  options: PollOptions = {},
): Promise<Generation> {
  const { interval = 2000, timeout = 120_000, onProgress } = options
  const start = Date.now()

  // Estimate typical duration for progress bar
  let typicalDuration = 15 // default seconds
  // We'll get the model from the first poll response

  let currentInterval = interval
  let model: string | undefined

  while (true) {
    const elapsed = (Date.now() - start) / 1000

    if (Date.now() - start > timeout) {
      throw new Error(`Generation timed out after ${timeout / 1000}s`)
    }

    const gen = await client.getGeneration(id)

    // Capture model on first response
    if (!model && gen.model) {
      model = gen.model
      typicalDuration = TYPICAL_DURATIONS[gen.model] ?? 15
    }

    if (gen.status === 'succeeded') return gen
    if (gen.status === 'failed') {
      throw new Error(gen.error ?? 'Generation failed')
    }

    // Report progress
    const estimatedProgress = Math.min(elapsed / typicalDuration, 0.95)
    onProgress?.(elapsed, estimatedProgress)

    // Back off after 30s
    if (elapsed > 30) currentInterval = 5000

    await new Promise((r) => setTimeout(r, currentInterval))
  }
}

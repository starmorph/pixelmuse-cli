import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { Select, TextInput, Spinner } from '@inkjs/ui'
import type { PixelmuseClient } from '../api/client.js'
import type { Generation, Model, AspectRatio, Style } from '../api/types.js'
import { pollGeneration } from '../api/polling.js'
import { imageToBuffer, autoSave } from '../lib/image.js'
import GenerationProgress from '../components/GenerationProgress.js'
import type { Route } from '../hooks/useRouter.js'

type Step = 'prompt' | 'model' | 'options' | 'generating' | 'preview'

const GEMINI_MODELS = new Set(['nano-banana-2', 'nano-banana-pro', 'imagen-3'])

const MODEL_OPTIONS = [
  { label: 'Nano Banana 2 (1 credit, fast)', value: 'nano-banana-2' },
  { label: 'Nano Banana Pro (3 credits)', value: 'nano-banana-pro' },
  { label: 'Flux Schnell (1 credit)', value: 'flux-schnell' },
  { label: 'Google Imagen 3 (1 credit)', value: 'imagen-3' },
  { label: 'Ideogram v3 Turbo (1 credit)', value: 'ideogram-v3-turbo' },
  { label: 'Recraft V4 (1 credit)', value: 'recraft-v4' },
  { label: 'Recraft V4 Pro (3 credits)', value: 'recraft-v4-pro' },
]

const ASPECT_OPTIONS = [
  { label: '1:1 Square', value: '1:1' },
  { label: '16:9 Landscape', value: '16:9' },
  { label: '9:16 Portrait', value: '9:16' },
  { label: '3:2 Landscape', value: '3:2' },
  { label: '2:3 Portrait', value: '2:3' },
  { label: '4:3 Landscape', value: '4:3' },
  { label: '21:9 Ultrawide', value: '21:9' },
]

const STYLE_OPTIONS = [
  { label: 'None (default)', value: 'none' },
  { label: 'Realistic', value: 'realistic' },
  { label: 'Anime', value: 'anime' },
  { label: 'Artistic', value: 'artistic' },
]

/** Payload passed to app exit when preview is ready */
export interface PreviewPayload {
  type: 'preview'
  generation: Generation
  imagePath: string | null
}

interface Props {
  client: PixelmuseClient
  navigate: (route: Route) => void
  initialPrompt?: string
  initialModel?: string
  initialAspectRatio?: string
  initialStyle?: string
  defaultModel?: string
  defaultAspectRatio?: string
  defaultStyle?: string
}

export default function Generate({
  client,
  navigate,
  initialPrompt,
  initialModel,
  initialAspectRatio,
  initialStyle,
  defaultModel = 'nano-banana-2',
  defaultAspectRatio = '1:1',
  defaultStyle = 'none',
}: Props) {
  const { exit } = useApp()
  const [step, setStep] = useState<Step>(initialPrompt ? 'model' : 'prompt')
  const [prompt, setPrompt] = useState(initialPrompt ?? '')
  const [model, setModel] = useState<Model>((initialModel ?? defaultModel) as Model)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    (initialAspectRatio ?? defaultAspectRatio) as AspectRatio,
  )
  const [style, setStyle] = useState<Style>((initialStyle ?? defaultStyle) as Style)

  // Generation state
  const [generation, setGeneration] = useState<Generation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Skip steps if values provided via flags
  useEffect(() => {
    if (initialPrompt && initialModel) {
      if (initialAspectRatio && initialStyle) {
        setStep('generating')
      } else if (initialAspectRatio) {
        setStep('generating')
      } else {
        setStep('options')
      }
    }
  }, [])

  // Handle generation
  const generate = useCallback(async () => {
    setStep('generating')
    setError(null)
    const start = Date.now()

    const timer = setInterval(() => {
      setElapsed((Date.now() - start) / 1000)
    }, 100)

    try {
      let gen = await client.generate({
        prompt,
        model,
        aspect_ratio: aspectRatio,
        style: style === 'none' ? undefined : style,
      })

      // Replicate models: poll
      if (gen.status === 'processing' || gen.status === 'pending') {
        gen = await pollGeneration(client, gen.id, {
          onProgress: (e, p) => {
            setElapsed(e)
            setProgress(p)
          },
        })
      }

      clearInterval(timer)
      setGeneration(gen)

      // Auto-save then exit Ink to render image outside of Ink
      let imagePath: string | null = null
      if (gen.output?.[0]) {
        const buf = await imageToBuffer(gen.output[0])
        imagePath = autoSave(gen.id, buf)
      }

      // Exit Ink with preview payload — image will be rendered post-unmount
      const payload: PreviewPayload = { type: 'preview', generation: gen, imagePath }
      exit(undefined as never)
      // Store payload on process for cli.tsx to read
      ;(globalThis as Record<string, unknown>).__pixelmuse_preview = payload
      setStep('preview')
    } catch (err) {
      clearInterval(timer)
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStep('preview')
    }
  }, [client, prompt, model, aspectRatio, style, exit])

  // Auto-trigger generation when step is 'generating'
  useEffect(() => {
    if (step === 'generating' && !generation && !error) {
      generate()
    }
  }, [step])

  // Preview keybinds (only for error state — success exits Ink)
  useInput(
    (input) => {
      if (step !== 'preview') return
      if (input === 'r') {
        setGeneration(null)
        setError(null)
        setProgress(0)
        setElapsed(0)
        setStep('generating')
      } else if (input === 'h') {
        navigate({ screen: 'home' })
      }
    },
  )

  // ── Render by step ──────────────────────────────────────────────────

  if (step === 'prompt') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Enter your prompt:</Text>
        <TextInput
          placeholder="A cinematic landscape with dramatic lighting..."
          onSubmit={(value) => {
            if (value.trim()) {
              setPrompt(value.trim())
              setStep('model')
            }
          }}
        />
      </Box>
    )
  }

  if (step === 'model') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Select model:</Text>
        <Text color="gray" wrap="truncate">
          {prompt}
        </Text>
        <Select
          options={MODEL_OPTIONS}
          onChange={(value) => {
            setModel(value as Model)
            setStep('options')
          }}
        />
      </Box>
    )
  }

  if (step === 'options') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Aspect ratio:</Text>
        <Select
          options={ASPECT_OPTIONS}
          onChange={(value) => {
            setAspectRatio(value as AspectRatio)
            setStep('generating')
          }}
        />
      </Box>
    )
  }

  if (step === 'generating') {
    const provider = GEMINI_MODELS.has(model) ? 'gemini' : 'replicate'
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="gray" wrap="truncate">
          {prompt}
        </Text>
        <GenerationProgress provider={provider} progress={progress} elapsed={elapsed} model={model} />
      </Box>
    )
  }

  // Preview step — only shown for errors (success exits Ink before reaching here)
  return (
    <Box flexDirection="column" gap={1}>
      <Text color="red">Error: {error}</Text>
      <Text color="gray">[r] retry | [h] home</Text>
    </Box>
  )
}

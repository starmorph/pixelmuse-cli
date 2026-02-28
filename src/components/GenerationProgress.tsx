import React from 'react'
import { Box, Text } from 'ink'
import { Spinner, ProgressBar } from '@inkjs/ui'

interface Props {
  /** 'gemini' models use spinner, 'replicate' models use progress bar */
  provider: 'gemini' | 'replicate'
  /** 0-1 estimated progress (for replicate models) */
  progress?: number
  /** Elapsed seconds */
  elapsed?: number
  model?: string
}

export default function GenerationProgress({ provider, progress = 0, elapsed = 0, model }: Props) {
  const elapsedStr = `${Math.round(elapsed)}s`

  if (provider === 'gemini') {
    return (
      <Box flexDirection="column" gap={1}>
        <Spinner label={`Generating with ${model ?? 'Gemini'}... (${elapsedStr})`} />
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        Generating with <Text bold>{model ?? 'Replicate'}</Text>... ({elapsedStr})
      </Text>
      <ProgressBar value={Math.round(progress * 100)} />
    </Box>
  )
}

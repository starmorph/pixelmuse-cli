import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import { Spinner } from '@inkjs/ui'
import { execSync } from 'node:child_process'
import { hasChafa } from '../core/image.js'

interface Props {
  /** Path to image file */
  source: string | Buffer
  width?: number
}

/** Renders image as ANSI half-block characters inside Ink's layout */
export default function ImagePreview({ source, width }: Props) {
  const [ansi, setAnsi] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (typeof source !== 'string' || !hasChafa()) {
      setState('error')
      return
    }

    try {
      const cols = width ?? Math.min(process.stdout.columns ?? 80, 80)
      const result = execSync(
        `chafa --format symbols --size ${cols} --animate off "${source}"`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
      )
      setAnsi(result)
      setState('done')
    } catch {
      setState('error')
    }
  }, [source, width])

  if (state === 'error') {
    return (
      <Box>
        <Text color="red">[Preview unavailable — install chafa for best results]</Text>
      </Box>
    )
  }

  if (state === 'loading') {
    return (
      <Box>
        <Spinner label="Rendering preview..." />
      </Box>
    )
  }

  return <Text>{ansi}</Text>
}

import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import { Spinner } from '@inkjs/ui'
import { renderImageToStdout } from '../lib/image.js'

interface Props {
  /** Path to image file or Buffer */
  source: string | Buffer
  width?: number
}

export default function ImagePreview({ source, width }: Props) {
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    renderImageToStdout(source, { width })
      .then((ok) => {
        if (!cancelled) setState(ok ? 'done' : 'error')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
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

  // Image was rendered directly to stdout, nothing to show in Ink
  return null
}

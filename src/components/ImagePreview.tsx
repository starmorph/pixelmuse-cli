import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import { Spinner } from '@inkjs/ui'
import { renderImage } from '../lib/image.js'

interface Props {
  /** Path to image file or Buffer */
  source: string | Buffer
  width?: number
}

export default function ImagePreview({ source, width }: Props) {
  const [rendered, setRendered] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    renderImage(source, { width })
      .then((result) => {
        if (!cancelled) setRendered(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Render failed')
      })
    return () => {
      cancelled = true
    }
  }, [source, width])

  if (error) {
    return (
      <Box>
        <Text color="red">[Preview error: {error}]</Text>
      </Box>
    )
  }

  if (!rendered) {
    return (
      <Box>
        <Spinner label="Rendering preview..." />
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text>{rendered}</Text>
    </Box>
  )
}

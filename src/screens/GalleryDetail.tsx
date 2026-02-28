import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { ConfirmInput, Spinner } from '@inkjs/ui'
import type { PixelmuseClient } from '../api/client.js'
import type { Generation } from '../api/types.js'
import { imageToBuffer, autoSave } from '../lib/image.js'
import ImagePreview from '../components/ImagePreview.js'
import type { Route } from '../hooks/useRouter.js'

interface Props {
  client: PixelmuseClient
  generationId: string
  navigate: (route: Route) => void
  back: () => void
}

export default function GalleryDetail({ client, generationId, navigate, back }: Props) {
  const [generation, setGeneration] = useState<Generation | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const gen = await client.getGeneration(generationId)
        if (cancelled) return
        setGeneration(gen)

        if (gen.output?.[0]) {
          const buf = await imageToBuffer(gen.output[0])
          if (!cancelled) {
            const path = autoSave(gen.id, buf)
            setImagePath(path)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [generationId])

  useInput((input) => {
    if (confirming) return
    if (input === 'd') setConfirming(true)
    if (input === 'r' && generation) {
      navigate({ screen: 'generate', prompt: generation.prompt, model: generation.model })
    }
  })

  const handleConfirm = async () => {
    setConfirming(false)
    try {
      await client.deleteGeneration(generationId)
      back()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleCancel = () => {
    setConfirming(false)
  }

  if (loading) return <Spinner label="Loading..." />
  if (error) return <Text color="red">Error: {error}</Text>
  if (!generation) return <Text color="red">Generation not found</Text>

  return (
    <Box flexDirection="column" gap={1}>
      {imagePath && <ImagePreview source={imagePath} />}

      <Box flexDirection="column">
        <Text>
          <Text bold>Prompt: </Text>
          {generation.prompt}
        </Text>
        <Text>
          <Text bold>Model: </Text>
          {generation.model}
        </Text>
        <Text>
          <Text bold>Credits: </Text>
          <Text color="green">{generation.credits_charged}</Text>
        </Text>
        <Text>
          <Text bold>Created: </Text>
          {new Date(generation.created_at).toLocaleString()}
        </Text>
        {generation.completed_at && (
          <Text>
            <Text bold>Duration: </Text>
            {Math.round(
              (new Date(generation.completed_at).getTime() -
                new Date(generation.created_at).getTime()) /
                1000,
            )}
            s
          </Text>
        )}
      </Box>

      {confirming ? (
        <Box>
          <Text color="red">Delete this generation? </Text>
          <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />
        </Box>
      ) : (
        <Text color="gray">[d] delete | [r] regenerate | esc back</Text>
      )}
    </Box>
  )
}

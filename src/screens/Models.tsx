import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { Spinner } from '@inkjs/ui'
import { PixelmuseClient } from '../api/client.js'
import type { ModelInfo } from '../api/types.js'
import ModelTable from '../components/ModelTable.js'
import type { Route } from '../hooks/useRouter.js'

interface Props {
  navigate: (route: Route) => void
}

export default function Models({ navigate }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    PixelmuseClient.listModels()
      .then(setModels)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  useInput((input, key) => {
    if (key.upArrow) setSelectedIndex((i) => Math.max(0, i - 1))
    if (key.downArrow) setSelectedIndex((i) => Math.min(models.length - 1, i + 1))
    if (key.return || input === 'g') {
      const model = models[selectedIndex]
      if (model) navigate({ screen: 'generate', model: model.id })
    }
  })

  if (loading) return <Spinner label="Loading models..." />
  if (error) return <Text color="red">Error: {error}</Text>

  const selected = models[selectedIndex]

  return (
    <Box flexDirection="column" gap={1}>
      <ModelTable models={models} selectedIndex={selectedIndex} />

      {selected && (
        <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold>{selected.name}</Text>
          <Text color="gray">{selected.description}</Text>
          <Text>
            Aspect ratios: <Text color="cyan">{selected.supported_aspect_ratios.join(', ')}</Text>
          </Text>
          {selected.weaknesses.length > 0 && (
            <Text>
              Weaknesses: <Text color="yellow">{selected.weaknesses.join(', ')}</Text>
            </Text>
          )}
        </Box>
      )}

      <Text color="gray">↑↓ navigate | enter or [g] generate with model</Text>
    </Box>
  )
}

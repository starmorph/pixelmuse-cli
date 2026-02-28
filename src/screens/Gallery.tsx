import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { Spinner } from '@inkjs/ui'
import type { PixelmuseClient } from '../core/client.js'
import type { Generation } from '../core/types.js'
import ImageGrid from '../components/ImageGrid.js'
import type { Route } from '../hooks/useRouter.js'

interface Props {
  client: PixelmuseClient
  navigate: (route: Route) => void
}

export default function Gallery({ client, navigate }: Props) {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()

  const load = async (nextCursor?: string) => {
    setLoading(true)
    try {
      const result = await client.listGenerations({ cursor: nextCursor, limit: 12 })
      if (nextCursor) {
        setGenerations((prev) => [...prev, ...result.data])
      } else {
        setGenerations(result.data)
      }
      setHasMore(result.has_more)
      setCursor(result.next_cursor ?? undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gallery')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useInput((input) => {
    if (input === 'l' && hasMore && !loading) {
      load(cursor)
    }
  })

  if (loading && generations.length === 0) {
    return <Spinner label="Loading gallery..." />
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>
  }

  if (generations.length === 0) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text>No generations yet.</Text>
        <Text color="gray">Generate your first image to see it here!</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1}>
      <ImageGrid
        generations={generations}
        onSelect={(gen) => navigate({ screen: 'gallery-detail', id: gen.id })}
      />
      {hasMore && <Text color="gray">[l] load more</Text>}
      {loading && <Spinner label="Loading more..." />}
    </Box>
  )
}

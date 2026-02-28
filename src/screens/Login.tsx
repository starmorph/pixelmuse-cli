import React, { useState } from 'react'
import { Box, Text } from 'ink'
import { TextInput, Spinner, StatusMessage } from '@inkjs/ui'

interface Props {
  onLogin: (key: string) => Promise<{ success: boolean; error?: string }>
  onSuccess: () => void
}

export default function Login({ onLogin, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (value: string) => {
    const key = value.trim()
    if (!key) return

    setLoading(true)
    setError(null)

    const result = await onLogin(key)
    setLoading(false)

    if (result.success) {
      onSuccess()
    } else {
      setError(result.error ?? 'Login failed')
    }
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Enter your Pixelmuse API key</Text>
      <Text color="gray">
        Get your key at{' '}
        <Text color="cyan" underline>
          pixelmuse.studio/developers
        </Text>
      </Text>

      {error && <StatusMessage variant="error">{error}</StatusMessage>}

      {loading ? (
        <Spinner label="Validating key..." />
      ) : (
        <Box>
          <Text color="gray">Key: </Text>
          <TextInput placeholder="pm_live_..." onSubmit={handleSubmit} />
        </Box>
      )}
    </Box>
  )
}

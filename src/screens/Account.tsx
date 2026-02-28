import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { Spinner } from '@inkjs/ui'
import type { PixelmuseClient } from '../api/client.js'
import type { Account as AccountType, Usage } from '../api/types.js'
import type { Route } from '../hooks/useRouter.js'

interface Props {
  client: PixelmuseClient
  account: AccountType | null
  navigate: (route: Route) => void
  onLogout: () => void
}

export default function Account({ client, account, navigate, onLogout }: Props) {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    client
      .getUsage({ start: thirtyDaysAgo.toISOString(), end: now.toISOString() })
      .then(setUsage)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useInput((input) => {
    if (input === 'b') navigate({ screen: 'buy-credits' })
    if (input === 'l') onLogout()
  })

  if (!account) return <Spinner label="Loading account..." />

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text>
          <Text bold>Email: </Text>
          {account.email}
        </Text>
        <Text>
          <Text bold>Plan: </Text>
          <Text color="cyan">{account.plan}</Text>
        </Text>
        <Text>
          <Text bold>Credits: </Text>
          <Text color="green">{account.credits.total}</Text>
          <Text color="gray">
            {' '}
            (subscription: {account.credits.subscription}, purchased: {account.credits.purchased})
          </Text>
        </Text>
        <Text>
          <Text bold>Rate limit: </Text>
          {account.rate_limit.requests_per_minute} req/min
        </Text>
      </Box>

      {loading ? (
        <Spinner label="Loading usage..." />
      ) : usage ? (
        <Box flexDirection="column">
          <Text bold>30-Day Usage</Text>
          <Text>
            Generations: <Text color="cyan">{usage.generations_count}</Text> | Credits used:{' '}
            <Text color="yellow">{usage.credits_used}</Text>
          </Text>
          {usage.by_model.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {usage.by_model.map((m) => (
                <Text key={m.model}>
                  {'  '}
                  {m.model}: {m.count} generations ({m.credits} credits)
                </Text>
              ))}
            </Box>
          )}
        </Box>
      ) : null}

      <Text color="gray">[b] buy credits | [l] logout | esc back</Text>
    </Box>
  )
}

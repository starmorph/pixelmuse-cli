import React from 'react'
import { Box, Text } from 'ink'
import { Select } from '@inkjs/ui'
import type { Account } from '../api/types.js'
import type { Route } from '../hooks/useRouter.js'

interface Props {
  account: Account | null
  navigate: (route: Route) => void
  onLogout: () => void
}

export default function Home({ account, navigate, onLogout }: Props) {
  const items = [
    { label: 'Generate Image', value: 'generate' },
    { label: 'Gallery', value: 'gallery' },
    { label: 'Prompt Templates', value: 'prompts' },
    { label: 'Models', value: 'models' },
    { label: 'Account & Credits', value: 'account' },
    { label: 'Logout', value: 'logout' },
  ]

  return (
    <Box flexDirection="column" gap={1}>
      {account && (
        <Box flexDirection="column">
          <Text>
            Welcome, <Text bold>{account.email}</Text>
          </Text>
          <Text color="green">
            {account.credits.total} credits available
          </Text>
        </Box>
      )}

      <Select
        options={items}
        onChange={(value) => {
          switch (value) {
            case 'generate':
              navigate({ screen: 'generate' })
              break
            case 'gallery':
              navigate({ screen: 'gallery' })
              break
            case 'prompts':
              navigate({ screen: 'prompts' })
              break
            case 'models':
              navigate({ screen: 'models' })
              break
            case 'account':
              navigate({ screen: 'account' })
              break
            case 'logout':
              onLogout()
              break
          }
        }}
      />
    </Box>
  )
}

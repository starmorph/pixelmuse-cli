import React from 'react'
import { Box, Text } from 'ink'
import type { Account } from '../core/types.js'

interface Props {
  account: Account | null
  hints?: string
}

export default function StatusBar({ account, hints }: Props) {
  return (
    <Box marginTop={1} paddingX={1} borderStyle="single" borderColor="gray">
      {account && (
        <>
          <Text color="green">credits: {account.credits.total}</Text>
          <Text color="gray"> | </Text>
          <Text color="cyan">plan: {account.plan}</Text>
          <Text color="gray"> | </Text>
        </>
      )}
      <Text color="gray">{hints ?? 'q quit | esc back'}</Text>
    </Box>
  )
}

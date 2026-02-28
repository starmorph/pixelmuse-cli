import React from 'react'
import { Box, Text } from 'ink'
import type { Route } from '../hooks/useRouter.js'

const SCREEN_LABELS: Record<string, string> = {
  home: 'Home',
  login: 'Login',
  generate: 'Generate',
  gallery: 'Gallery',
  'gallery-detail': 'Image Detail',
  models: 'Models',
  prompts: 'Prompts',
  'prompt-editor': 'Prompt Editor',
  account: 'Account',
  'buy-credits': 'Buy Credits',
}

export default function Header({ route }: { route: Route }) {
  const label = SCREEN_LABELS[route.screen] ?? route.screen

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} marginBottom={1}>
      <Text bold color="magenta">
        pixelmuse
      </Text>
      <Text color="gray"> / </Text>
      <Text color="white">{label}</Text>
    </Box>
  )
}

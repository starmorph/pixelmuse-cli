import React, { useEffect } from 'react'
import { Box, useApp, useInput } from 'ink'
import { useRouter, type Route } from './hooks/useRouter.js'
import { useAuth } from './hooks/useAuth.js'
import { useApi } from './hooks/useApi.js'
import { useConfig } from './hooks/useConfig.js'
import { Spinner } from '@inkjs/ui'
import Header from './components/Header.js'
import StatusBar from './components/StatusBar.js'
import Home from './screens/Home.js'
import Login from './screens/Login.js'
import Generate from './screens/Generate.js'
import Gallery from './screens/Gallery.js'
import GalleryDetail from './screens/GalleryDetail.js'
import Models from './screens/Models.js'
import Prompts from './screens/Prompts.js'
import PromptEditor from './screens/PromptEditor.js'
import Account from './screens/Account.js'
import BuyCredits from './screens/BuyCredits.js'

interface AppProps {
  initialRoute?: Route
}

// Screens that don't require auth
const PUBLIC_SCREENS = new Set(['login', 'models'])

export default function App({ initialRoute }: AppProps) {
  const { exit } = useApp()
  const { route, navigate, back, replace } = useRouter(initialRoute ?? { screen: 'home' })
  const auth = useAuth()
  const client = useApi(auth.apiKey)
  const { settings } = useConfig()

  // Auth gate: redirect to login if needed
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !PUBLIC_SCREENS.has(route.screen)) {
      replace({ screen: 'login' })
    }
  }, [auth.isLoading, auth.isAuthenticated, route.screen])

  // Global keybinds
  useInput((input, key) => {
    if (input === 'q') exit()
    if (key.escape) back()
  })

  // Loading state
  if (auth.isLoading) {
    return (
      <Box flexDirection="column">
        <Header route={route} />
        <Spinner label="Loading..." />
      </Box>
    )
  }

  const renderScreen = () => {
    switch (route.screen) {
      case 'login':
        return (
          <Login
            onLogin={auth.login}
            onSuccess={() => navigate({ screen: 'home' })}
          />
        )

      case 'home':
        return (
          <Home
            account={auth.account}
            navigate={navigate}
            onLogout={async () => {
              await auth.logout()
              replace({ screen: 'login' })
            }}
          />
        )

      case 'generate':
        if (!client) return null
        return (
          <Generate
            client={client}
            navigate={navigate}
            initialPrompt={route.prompt}
            initialModel={route.model}
            initialAspectRatio={route.aspectRatio}
            initialStyle={route.style}
            defaultModel={settings.defaultModel}
            defaultAspectRatio={settings.defaultAspectRatio}
            defaultStyle={settings.defaultStyle}
          />
        )

      case 'gallery':
        if (!client) return null
        return <Gallery client={client} navigate={navigate} />

      case 'gallery-detail':
        if (!client) return null
        return (
          <GalleryDetail
            client={client}
            generationId={route.id}
            navigate={navigate}
            back={back}
          />
        )

      case 'models':
        return <Models navigate={navigate} />

      case 'prompts':
        return <Prompts navigate={navigate} />

      case 'prompt-editor':
        return <PromptEditor existingName={route.name} onDone={back} />

      case 'account':
        if (!client) return null
        return (
          <Account
            client={client}
            account={auth.account}
            navigate={navigate}
            onLogout={async () => {
              await auth.logout()
              replace({ screen: 'login' })
            }}
          />
        )

      case 'buy-credits':
        if (!client) return null
        return (
          <BuyCredits
            client={client}
            onRefreshAccount={auth.refreshAccount}
            back={back}
          />
        )

      default:
        return null
    }
  }

  return (
    <Box flexDirection="column">
      <Header route={route} />
      {renderScreen()}
      <StatusBar account={auth.account} />
    </Box>
  )
}

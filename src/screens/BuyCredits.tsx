import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { Select, Spinner } from '@inkjs/ui'
import open from 'open'
import { PixelmuseClient } from '../api/client.js'
import type { CreditPackage } from '../api/types.js'
import type { PackageName } from '../api/types.js'

interface Props {
  client: PixelmuseClient
  onRefreshAccount: () => void
  back: () => void
}

export default function BuyCredits({ client, onRefreshAccount, back }: Props) {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutOpened, setCheckoutOpened] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    PixelmuseClient.listPackages()
      .then(setPackages)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  // After checkout opened, any key refreshes account
  useInput(() => {
    if (checkoutOpened) {
      onRefreshAccount()
      back()
    }
  })

  if (loading) return <Spinner label="Loading packages..." />
  if (error) return <Text color="red">Error: {error}</Text>

  if (checkoutOpened) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">Checkout opened in your browser.</Text>
        <Text color="gray">Press any key to refresh your balance and go back.</Text>
      </Box>
    )
  }

  const options = packages.map((p) => ({
    label: `${p.label} — ${p.credits + p.bonus_credits} credits — $${p.price_usd}`,
    value: p.name,
  }))

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Buy Credits</Text>
      <Select
        options={options}
        onChange={async (value) => {
          try {
            const { checkout_url } = await client.createCheckout({
              package: value as PackageName,
            })
            await open(checkout_url)
            setCheckoutOpened(true)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Checkout failed')
          }
        }}
      />
    </Box>
  )
}

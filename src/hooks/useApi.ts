import { useMemo } from 'react'
import { PixelmuseClient } from '../api/client.js'

/** Create an API client instance from an API key */
export function useApi(apiKey: string | null): PixelmuseClient | null {
  return useMemo(() => (apiKey ? new PixelmuseClient(apiKey) : null), [apiKey])
}

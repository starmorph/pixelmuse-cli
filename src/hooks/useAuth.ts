import { useState, useEffect, useCallback } from 'react'
import type { Account } from '../core/types.js'
import { PixelmuseClient } from '../core/client.js'
import { getApiKey, saveApiKey, deleteApiKey, isValidKeyFormat } from '../core/auth.js'

interface AuthState {
  apiKey: string | null
  account: Account | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    apiKey: null,
    account: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  // Load stored key on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const key = await getApiKey()
      if (cancelled) return

      if (key) {
        setState((s) => ({ ...s, apiKey: key, isAuthenticated: true, isLoading: false }))
        // Fetch account in background
        try {
          const client = new PixelmuseClient(key)
          const account = await client.getAccount()
          if (!cancelled) setState((s) => ({ ...s, account }))
        } catch {
          // Account fetch failure is non-critical
        }
      } else {
        setState((s) => ({ ...s, isLoading: false }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (key: string): Promise<{ success: boolean; error?: string }> => {
    if (!isValidKeyFormat(key)) {
      return { success: false, error: 'Invalid key format. Keys start with pm_live_ or pm_test_' }
    }

    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const client = new PixelmuseClient(key)
      const account = await client.getAccount()
      await saveApiKey(key)
      setState({ apiKey: key, account, isAuthenticated: true, isLoading: false, error: null })
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setState((s) => ({ ...s, isLoading: false, error: msg }))
      return { success: false, error: msg }
    }
  }, [])

  const logout = useCallback(async () => {
    await deleteApiKey()
    setState({ apiKey: null, account: null, isAuthenticated: false, isLoading: false, error: null })
  }, [])

  const refreshAccount = useCallback(async () => {
    if (!state.apiKey) return
    try {
      const client = new PixelmuseClient(state.apiKey)
      const account = await client.getAccount()
      setState((s) => ({ ...s, account }))
    } catch {
      // ignore
    }
  }, [state.apiKey])

  return { ...state, login, logout, refreshAccount }
}

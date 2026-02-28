import { useState, useCallback } from 'react'
import { readSettings, writeSettings, type Settings } from '../lib/config.js'

export function useConfig() {
  const [settings, setSettings] = useState<Settings>(() => readSettings())

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    const next = { ...settings, ...updates }
    writeSettings(next)
    setSettings(next)
  }, [settings])

  return { settings, updateSettings }
}

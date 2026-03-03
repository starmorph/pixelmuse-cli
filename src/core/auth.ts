import { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { PATHS, ensureDirs } from './config.js'

const KEY_PATTERN = /^pm_(live|test)_[0-9a-f]{32}$/
const SERVICE = 'pixelmuse-cli'
const ACCOUNT = 'api-key'

/** Validate API key format */
export function isValidKeyFormat(key: string): boolean {
  return KEY_PATTERN.test(key)
}

/** Get API key using 3-tier resolution: env → keychain → file */
export async function getApiKey(): Promise<string | null> {
  // 1. Environment variable
  const envKey = process.env['PIXELMUSE_API_KEY']
  if (envKey) return envKey

  // 2. OS keychain (optional dependency)
  try {
    const { getPassword } = await import('keyring-node')
    const keychainKey = getPassword(SERVICE, ACCOUNT)
    if (keychainKey) return keychainKey
  } catch {
    // keyring-node not available or failed
  }

  // 3. Config file fallback
  if (existsSync(PATHS.auth)) {
    try {
      const data = JSON.parse(readFileSync(PATHS.auth, 'utf-8')) as { apiKey?: string }
      if (data.apiKey) return data.apiKey
    } catch {
      // ignore parse errors
    }
  }

  return null
}

/** Store API key in keychain (preferred) or config file (fallback) */
export async function saveApiKey(key: string): Promise<void> {
  ensureDirs()

  // Try keychain first
  try {
    const { setPassword } = await import('keyring-node')
    setPassword(SERVICE, ACCOUNT, key)
    return
  } catch {
    // Fall back to file
  }

  // File fallback with restrictive permissions
  writeFileSync(PATHS.auth, JSON.stringify({ apiKey: key }), 'utf-8')
  chmodSync(PATHS.auth, 0o600)
  console.error(`Credentials stored in ${PATHS.auth} (install keyring-node for OS keychain)`)
}

/** Delete API key from all storage locations */
export async function deleteApiKey(): Promise<void> {
  // Try keychain
  try {
    const { deletePassword } = await import('keyring-node')
    deletePassword(SERVICE, ACCOUNT)
  } catch {
    // ignore
  }

  // Delete file
  try {
    unlinkSync(PATHS.auth)
  } catch {
    // ignore — file may not exist
  }
}

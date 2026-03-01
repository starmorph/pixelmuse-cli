import { CLI_VERSION } from './client.js'

const BASE_URL = 'https://www.pixelmuse.studio/api/v1'

interface DeviceAuthInit {
  deviceCode: string
  userCode: string
  verificationUri: string
  verificationUriComplete: string
  expiresIn: number
  interval: number
}

interface DeviceAuthResult {
  apiKey: string
  keyPrefix: string
}

/** Initiate device code auth flow — returns codes and verification URL */
export async function initiateDeviceAuth(): Promise<DeviceAuthInit> {
  const res = await fetch(`${BASE_URL}/auth/device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `pixelmuse-cli/${CLI_VERSION}`,
    },
    body: JSON.stringify({
      client_info: {
        platform: process.platform,
        cli_version: CLI_VERSION,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to initiate device auth (HTTP ${res.status}): ${body}`)
  }

  const data = (await res.json()) as Record<string, unknown>
  return {
    deviceCode: data.device_code as string,
    userCode: data.user_code as string,
    verificationUri: data.verification_uri as string,
    verificationUriComplete: data.verification_uri_complete as string,
    expiresIn: data.expires_in as number,
    interval: data.interval as number,
  }
}

/** Poll the device token endpoint until authorized, expired, or denied */
export async function pollForToken(
  deviceCode: string,
  options: { interval: number; expiresIn: number; onPoll?: () => void },
): Promise<DeviceAuthResult> {
  const deadline = Date.now() + options.expiresIn * 1000
  let intervalMs = options.interval * 1000

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs))
    options.onPoll?.()

    try {
      const res = await fetch(`${BASE_URL}/auth/device/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `pixelmuse-cli/${CLI_VERSION}`,
        },
        body: JSON.stringify({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      })

      const data = (await res.json()) as Record<string, unknown>

      if (data.api_key) {
        return {
          apiKey: data.api_key as string,
          keyPrefix: data.key_prefix as string,
        }
      }

      if (data.error === 'slow_down') {
        intervalMs = ((data.interval as number) ?? 10) * 1000
        continue
      }

      if (data.error === 'expired_token') {
        throw new Error('Authorization timed out. Run `pixelmuse setup` to try again.')
      }

      if (data.error === 'access_denied') {
        throw new Error('Authorization was denied.')
      }

      // authorization_pending — keep polling
    } catch (err) {
      // Re-throw our own errors, swallow network errors
      if (err instanceof Error && (err.message.includes('timed out') || err.message.includes('denied'))) {
        throw err
      }
    }
  }

  throw new Error('Authorization timed out. Run `pixelmuse setup` to try again.')
}

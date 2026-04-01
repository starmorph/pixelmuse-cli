export interface SafeOpenResult {
  ok: boolean
  error?: string
}

export type OpenTarget = (target: string) => Promise<unknown>

export async function safeOpen(openTarget: OpenTarget, target: string): Promise<SafeOpenResult> {
  try {
    await openTarget(target)
    return { ok: true }
  } catch (error: unknown) {
    if (error instanceof Error && error.message) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Failed to open browser' }
  }
}

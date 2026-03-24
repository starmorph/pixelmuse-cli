import open from 'open'

const OPEN_BROWSER_ERROR = 'Failed to open browser'

export async function openUrlSafely(
  url: string,
  openUrl: (targetUrl: string) => Promise<unknown> = open,
): Promise<string | null> {
  try {
    await openUrl(url)
    return null
  } catch (err) {
    return err instanceof Error ? err.message : OPEN_BROWSER_ERROR
  }
}

export async function openGenerationInBrowser(
  generationId: string,
  openUrl: (targetUrl: string) => Promise<unknown> = open,
): Promise<string | null> {
  const url = `https://www.pixelmuse.studio/g/${generationId}`
  return openUrlSafely(url, openUrl)
}

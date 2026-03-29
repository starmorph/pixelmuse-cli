const GALLERY_URL_BASE = 'https://www.pixelmuse.studio/g/'

export async function openGenerationInBrowser(
  generationId: string,
  openUrl: (target: string) => Promise<unknown>,
): Promise<string | null> {
  const generationUrl = `${GALLERY_URL_BASE}${encodeURIComponent(generationId)}`

  try {
    await openUrl(generationUrl)
    return null
  } catch (err) {
    if (err instanceof Error && err.message) return err.message
    return 'Failed to open browser'
  }
}

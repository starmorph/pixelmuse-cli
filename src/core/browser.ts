import open from 'open'

const GENERATION_URL_BASE = 'https://www.pixelmuse.studio/g/'
const OPEN_BROWSER_ERROR = 'Failed to open browser. Open manually: '

export type OpenGenerationResult =
  | { ok: true; message: null }
  | { ok: false; message: string }

export type OpenUrl = (url: string) => Promise<void>

async function openUrl(url: string): Promise<void> {
  await open(url)
}

export async function openGenerationInBrowser(
  generationId: string,
  launch: OpenUrl = openUrl,
): Promise<OpenGenerationResult> {
  const url = `${GENERATION_URL_BASE}${encodeURIComponent(generationId)}`
  try {
    await launch(url)
    return { ok: true, message: null }
  } catch {
    return { ok: false, message: `${OPEN_BROWSER_ERROR}${url}` }
  }
}

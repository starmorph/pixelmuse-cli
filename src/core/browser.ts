import open from 'open'

type OpenFunction = (target: string) => Promise<unknown> | unknown

export async function openGenerationInBrowser(
  generationId: string,
  openFn: OpenFunction = open,
): Promise<string | null> {
  const generationUrl = `https://www.pixelmuse.studio/g/${generationId}`

  try {
    await Promise.resolve(openFn(generationUrl))
    return null
  } catch (error: unknown) {
    if (error instanceof Error && error.message) {
      return error.message
    }
    return 'Unknown error'
  }
}

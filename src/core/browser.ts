import open from 'open'

interface OpenInBrowserOptions {
  openUrl?: (url: string) => Promise<unknown>
}

/**
 * Open a URL in the system browser.
 */
export async function openInBrowser(url: string, options: OpenInBrowserOptions = {}): Promise<void> {
  const openUrl = options.openUrl ?? ((target: string) => open(target))
  await openUrl(url)
}

import open from 'open'

export function openUrlSafe(url: string, onError: (message: string) => void): void {
  void open(url).catch((err: unknown) => {
    onError(err instanceof Error ? err.message : 'Failed to open browser')
  })
}

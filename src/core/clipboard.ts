export function buildMacClipboardArgs(imagePath: string): string[] {
  return [
    '-e',
    'on run argv',
    '-e',
    'set imagePath to POSIX file (item 1 of argv)',
    '-e',
    'set the clipboard to (read imagePath as TIFF picture)',
    '-e',
    'end run',
    imagePath,
  ]
}

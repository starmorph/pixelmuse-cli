declare module 'keyring-node' {
  export function getPassword(service: string, account: string): string | null
  export function setPassword(service: string, account: string, password: string): void
  export function deletePassword(service: string, account: string): void
}

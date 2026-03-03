import type {
  Account,
  CheckoutRequest,
  CheckoutResponse,
  CreditPackage,
  GenerateRequest,
  Generation,
  ListImagesParams,
  ModelInfo,
  PaginatedGenerations,
  Usage,
  UsageParams,
} from './types.js'
import { ApiError } from './types.js'

export const CLI_VERSION: string = process.env.CLI_VERSION ?? '0.0.0'

const BASE_URL = 'https://www.pixelmuse.studio/api/v1'

const CLIENT_HEADERS: Record<string, string> = {
  'User-Agent': `pixelmuse-cli/${CLI_VERSION}`,
  'X-Client-Version': CLI_VERSION,
  'X-Client-Platform': process.platform,
}

export class PixelmuseClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(path: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    const url = `${BASE_URL}${path}`
    const { timeoutMs = 30_000, ...fetchOptions } = options
    const headers: Record<string, string> = {
      ...CLIENT_HEADERS,
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    let res: Response
    try {
      res = await fetch(url, { ...fetchOptions, headers, signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
    }

    const rateLimitRemaining = res.headers.get('X-RateLimit-Remaining')
    const retryAfter = res.headers.get('Retry-After')

    if (!res.ok) {
      let message = `HTTP ${res.status}`
      let code: string | undefined
      try {
        const body = (await res.json()) as { error?: string; code?: string }
        message = body.error ?? message
        code = body.code
      } catch {
        // ignore parse errors
      }
      throw new ApiError(
        message,
        res.status,
        code,
        rateLimitRemaining ? Number(rateLimitRemaining) : undefined,
        retryAfter ? Number(retryAfter) : undefined,
      )
    }

    return (await res.json()) as T
  }

  /** Generate an image. Uses Prefer: wait=55 for sync response. */
  async generate(req: GenerateRequest): Promise<Generation> {
    return this.request<Generation>('/images', {
      method: 'POST',
      headers: { Prefer: 'wait=55' },
      body: JSON.stringify(req),
      timeoutMs: 90_000,
    })
  }

  /** Get a single generation by ID */
  async getGeneration(id: string): Promise<Generation> {
    return this.request<Generation>(`/images/${encodeURIComponent(id)}`)
  }

  /** List generations with cursor pagination */
  async listGenerations(params?: ListImagesParams): Promise<PaginatedGenerations> {
    const query = new URLSearchParams()
    if (params?.cursor) query.set('cursor', params.cursor)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.status) query.set('status', params.status)
    const qs = query.toString()
    return this.request<PaginatedGenerations>(`/images${qs ? `?${qs}` : ''}`)
  }

  /** Delete a generation */
  async deleteGeneration(id: string): Promise<void> {
    await this.request<void>(`/images/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  /** Get account info */
  async getAccount(): Promise<Account> {
    return this.request<Account>('/account')
  }

  /** Get usage stats for a date range */
  async getUsage(params: UsageParams): Promise<Usage> {
    const query = new URLSearchParams({ start: params.start, end: params.end })
    return this.request<Usage>(`/account/usage?${query}`)
  }

  /** Create a Stripe checkout session */
  async createCheckout(req: CheckoutRequest): Promise<CheckoutResponse> {
    return this.request<CheckoutResponse>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(req),
    })
  }

  // ── Static methods (no auth required) ──────────────────────────────

  /** List all available models */
  static async listModels(): Promise<ModelInfo[]> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)
    try {
      const res = await fetch(`${BASE_URL}/models`, { headers: CLIENT_HEADERS, signal: controller.signal })
      if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status)
      const body = (await res.json()) as { data: ModelInfo[] }
      return body.data
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /** Get a single model by ID */
  static async getModel(id: string): Promise<ModelInfo> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)
    try {
      const res = await fetch(`${BASE_URL}/models/${encodeURIComponent(id)}`, { headers: CLIENT_HEADERS, signal: controller.signal })
      if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status)
      return (await res.json()) as ModelInfo
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /** List available credit packages */
  static async listPackages(): Promise<CreditPackage[]> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)
    try {
      const res = await fetch(`${BASE_URL}/billing/packages`, { headers: CLIENT_HEADERS, signal: controller.signal })
      if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status)
      const body = (await res.json()) as { data: CreditPackage[] }
      return body.data
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

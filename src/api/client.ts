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

const BASE_URL = 'https://www.pixelmuse.studio/api/v1'

export class PixelmuseClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    const res = await fetch(url, { ...options, headers })

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
    const res = await fetch(`${BASE_URL}/models`)
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status)
    return (await res.json()) as ModelInfo[]
  }

  /** Get a single model by ID */
  static async getModel(id: string): Promise<ModelInfo> {
    const res = await fetch(`${BASE_URL}/models/${encodeURIComponent(id)}`)
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status)
    return (await res.json()) as ModelInfo
  }

  /** List available credit packages */
  static async listPackages(): Promise<CreditPackage[]> {
    const res = await fetch(`${BASE_URL}/billing/packages`)
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status)
    return (await res.json()) as CreditPackage[]
  }
}

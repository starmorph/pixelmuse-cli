/** All available image generation models */
export type Model =
  | 'nano-banana-2'
  | 'nano-banana-pro'
  | 'flux-schnell'
  | 'imagen-3'
  | 'recraft-v4'
  | 'recraft-v4-pro'

export type Style = 'realistic' | 'anime' | 'artistic' | 'none'

export type AspectRatio =
  | '1:1'
  | '16:9'
  | '9:16'
  | '3:2'
  | '2:3'
  | '4:5'
  | '5:4'
  | '3:4'
  | '4:3'
  | '21:9'
  | '9:21'

export type GenerationStatus = 'pending' | 'processing' | 'succeeded' | 'failed'

export type Visibility = 'public' | 'private'

export type PackageName = 'credit_pack'

// ── Request types ──────────────────────────────────────────────────────

export interface GenerateRequest {
  prompt: string
  model: Model
  style?: Style
  aspect_ratio?: AspectRatio
  negative_prompt?: string
  image_input?: string
  visibility?: Visibility
}

export interface ListImagesParams {
  cursor?: string
  limit?: number
  status?: 'pending' | 'succeeded' | 'failed'
}

export interface UsageParams {
  start: string // ISO datetime
  end: string // ISO datetime
}

export interface CheckoutRequest {
  package: PackageName
}

// ── Response types ─────────────────────────────────────────────────────

export interface Generation {
  id: string
  status: GenerationStatus
  model: string
  prompt: string
  output: string[] | null
  credits_charged: number
  error: string | null
  created_at: string
  completed_at: string | null
  visibility: Visibility
}

export interface PaginatedGenerations {
  data: Generation[]
  has_more: boolean
  next_cursor: string | null
}

export interface ModelInfo {
  id: string
  name: string
  description: string
  credit_cost: number
  supported_aspect_ratios: string[]
  is_pro: boolean
  supports_image_input: boolean
  strengths: string[]
  weaknesses: string[]
}

export interface Account {
  user_id: string
  email: string
  plan: string
  credits: {
    total: number
    subscription: number
    purchased: number
  }
  rate_limit: {
    requests_per_minute: number
  }
}

export interface Usage {
  period: {
    start: string
    end: string
  }
  generations_count: number
  credits_used: number
  by_model: Array<{
    model: string
    count: number
    credits: number
  }>
}

export interface CreditPackage {
  name: string
  label: string
  credits: number
  bonus_credits: number
  price_usd: number
  price_cents: number
}

export interface CheckoutResponse {
  checkout_url: string
}

// ── Error types ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public rateLimitRemaining?: number,
    public retryAfter?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

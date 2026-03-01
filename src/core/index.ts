export { PixelmuseClient, CLI_VERSION } from './client.js'
export { pollGeneration } from './polling.js'
export { generateImage, type GenerateOptions, type GenerateResult } from './generate.js'
export { getApiKey, saveApiKey, deleteApiKey, isValidKeyFormat } from './auth.js'
export { PATHS, ensureDirs, readSettings, writeSettings, type Settings } from './config.js'
export { imageToBuffer, saveImage, autoSave, hasChafa, renderImageDirect } from './image.js'
export {
  listTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
  extractVariables,
  interpolate,
  slugify,
  type PromptTemplate,
} from './prompts.js'
export type {
  Model,
  Style,
  AspectRatio,
  GenerationStatus,
  PackageName,
  GenerateRequest,
  ListImagesParams,
  UsageParams,
  CheckoutRequest,
  Generation,
  PaginatedGenerations,
  ModelInfo,
  Account,
  Usage,
  CreditPackage,
  CheckoutResponse,
} from './types.js'
export { ApiError } from './types.js'
export { timeAgo } from './utils.js'

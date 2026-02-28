import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import YAML from 'yaml'
import { PATHS, ensureDirs } from './config.js'

export interface PromptTemplate {
  name: string
  description: string
  prompt: string
  defaults: {
    model?: string
    aspect_ratio?: string
    style?: string
  }
  variables: Record<string, string>
  tags: string[]
}

/** List all saved prompt templates */
export function listTemplates(): PromptTemplate[] {
  ensureDirs()
  if (!existsSync(PATHS.prompts)) return []

  const files = readdirSync(PATHS.prompts).filter((f: string) => f.endsWith('.yaml') || f.endsWith('.yml'))
  return files.map((f: string) => {
    const raw = readFileSync(join(PATHS.prompts, f), 'utf-8')
    return YAML.parse(raw) as PromptTemplate
  })
}

/** Get a template by name */
export function getTemplate(name: string): PromptTemplate | null {
  const slug = slugify(name)
  const path = join(PATHS.prompts, `${slug}.yaml`)
  if (!existsSync(path)) return null
  return YAML.parse(readFileSync(path, 'utf-8')) as PromptTemplate
}

/** Save a template (create or update) */
export function saveTemplate(template: PromptTemplate): void {
  ensureDirs()
  const slug = slugify(template.name)
  const path = join(PATHS.prompts, `${slug}.yaml`)
  writeFileSync(path, YAML.stringify(template), 'utf-8')
}

/** Delete a template by name */
export function deleteTemplate(name: string): boolean {
  const slug = slugify(name)
  const path = join(PATHS.prompts, `${slug}.yaml`)
  if (!existsSync(path)) return false
  unlinkSync(path)
  return true
}

/** Extract {{variable}} names from a prompt string */
export function extractVariables(prompt: string): string[] {
  const matches = prompt.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.slice(2, -2)))]
}

/** Replace {{variable}} placeholders with values */
export function interpolate(prompt: string, vars: Record<string, string>): string {
  return prompt.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`)
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

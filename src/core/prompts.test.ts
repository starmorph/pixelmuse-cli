import { describe, it, expect } from 'vitest'
import { slugify, interpolate, extractVariables } from './prompts.js'

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world')
  })

  it('lowercases input', () => {
    expect(slugify('Blog Thumbnail')).toBe('blog-thumbnail')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('collapses consecutive special characters', () => {
    expect(slugify('foo   bar!!!baz')).toBe('foo-bar-baz')
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })
})

describe('extractVariables', () => {
  it('extracts single variable', () => {
    expect(extractVariables('A {{subject}} photo')).toEqual(['subject'])
  })

  it('extracts multiple unique variables', () => {
    expect(extractVariables('{{color}} {{size}} {{color}}')).toEqual(['color', 'size'])
  })

  it('returns empty for no variables', () => {
    expect(extractVariables('no variables here')).toEqual([])
  })

  it('ignores malformed braces', () => {
    expect(extractVariables('{single} and {{ spaced }}')).toEqual([])
  })
})

describe('interpolate', () => {
  it('replaces variables with values', () => {
    expect(interpolate('A {{subject}} in {{style}}', { subject: 'cat', style: 'anime' }))
      .toBe('A cat in anime')
  })

  it('preserves unmatched variables', () => {
    expect(interpolate('{{a}} and {{b}}', { a: 'yes' })).toBe('yes and {{b}}')
  })

  it('handles empty vars object', () => {
    expect(interpolate('{{x}}', {})).toBe('{{x}}')
  })
})

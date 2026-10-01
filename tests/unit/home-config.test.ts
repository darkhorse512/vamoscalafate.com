import { describe, expect, it } from 'vitest'
import { DEFAULT_HOME_CONFIG, HOME_SECTION_IDS, homeConfigSchema, resolveHomeConfig } from '@vamos/validation'

describe('homepage configuration', () => {
  it('defaults are themselves valid', () => {
    expect(homeConfigSchema.safeParse(DEFAULT_HOME_CONFIG).success).toBe(true)
  })

  it('renders the defaults when nothing is saved', () => {
    expect(resolveHomeConfig(null)).toEqual(DEFAULT_HOME_CONFIG)
    expect(resolveHomeConfig(undefined)).toEqual(DEFAULT_HOME_CONFIG)
  })

  it('fills fields a stored document lacks from the defaults', () => {
    const stored = { sections: { cta: { title: 'Título propio' } } }
    const resolved = resolveHomeConfig(stored)
    expect(resolved.sections.cta.title).toBe('Título propio')
    expect(resolved.sections.cta.primary).toEqual(DEFAULT_HOME_CONFIG.sections.cta.primary)
    expect(resolved.sections.facts).toEqual(DEFAULT_HOME_CONFIG.sections.facts)
  })

  it('keeps a stored order but repairs duplicates, unknowns and missing sections', () => {
    const resolved = resolveHomeConfig({ order: ['cta', 'cta', 'nope', 'facts'] })
    expect(resolved.order.slice(0, 2)).toEqual(['cta', 'facts'])
    expect([...resolved.order].sort()).toEqual([...HOME_SECTION_IDS].sort())
  })

  it('falls back to the defaults instead of breaking on an invalid document', () => {
    const broken = { hero: { slides: [] } }
    expect(resolveHomeConfig(broken)).toEqual(DEFAULT_HOME_CONFIG)
  })

  it('rejects links that are neither internal paths nor https', () => {
    const bad = structuredClone(DEFAULT_HOME_CONFIG)
    bad.sections.cta.primary.href = 'javascript:alert(1)'
    const result = homeConfigSchema.safeParse(bad)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path.join('.')).toBe('sections.cta.primary.href')
  })

  it('requires exactly three tours for the "3 imperdibles" banner', () => {
    const bad = structuredClone(DEFAULT_HOME_CONFIG)
    bad.sections.catalogue.banner.tourSlugs = ['a', 'b']
    expect(homeConfigSchema.safeParse(bad).success).toBe(false)
  })
})

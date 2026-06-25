import { describe, expect, it } from 'vitest'
import { translateUi } from '../../../data/uiTranslations'
import { LAUNCHER_TASKS, type LauncherCreationMode, type LauncherTask } from '../../../data/workspaceLauncher/launcherTasks'
import { bestScore, fuzzyScore, normalizeText, searchLauncher } from '../fuzzyMatch'

const localizeDe = (key: LauncherTask['labelKey']) => translateUi('de', key)

describe('fuzzyScore', () => {
  it('normalizes diacritics and case', () => {
    expect(normalizeText('Psychopathologie')).toBe('psychopathologie')
    expect(normalizeText('Aufklärung')).toBe('aufklarung')
  })

  it('returns 0 when the query is not a subsequence', () => {
    expect(fuzzyScore('xyz', 'arztbrief')).toBe(0)
    expect(fuzzyScore('', 'arztbrief')).toBe(0)
  })

  it('ranks prefix matches above word-boundary above subsequence', () => {
    const prefix = fuzzyScore('psy', 'psychopathologie')
    const boundary = fuzzyScore('befund', 'psychopathologischer befund')
    const subseq = fuzzyScore('arzt', 'kassenarztbrief')
    expect(prefix).toBeGreaterThan(boundary)
    expect(boundary).toBeGreaterThan(subseq)
    expect(subseq).toBeGreaterThan(0)
  })

  it('bestScore picks the strongest candidate', () => {
    expect(bestScore('amdp', ['Freitext', 'AMDP-geführt', 'ISDM'])).toBeGreaterThan(0)
    expect(bestScore('nope', ['Freitext', 'AMDP'])).toBe(0)
  })
})

describe('searchLauncher', () => {
  it('returns nothing for an empty query', () => {
    expect(searchLauncher(LAUNCHER_TASKS, '   ', { localize: localizeDe })).toEqual([])
  })

  it('typing "psycho" suggests the expected clinical tasks + a mode shortcut', () => {
    const results = searchLauncher(LAUNCHER_TASKS, 'psycho', { localize: localizeDe })
    const taskIds = results.filter((r) => r.type === 'task').map((r) => r.task.id)

    // Psychopathologischer Befund, Psychotherapie (Therapieplanung) and
    // Psychoedukation (Patientenaufklärung) all surface via label/keywords.
    expect(taskIds).toContain('psychopath')
    expect(taskIds).toContain('therapieplanung')
    expect(taskIds).toContain('patientenaufklaerung')
  })

  it('maps a spoken German sentence to the right task', () => {
    const results = searchLauncher(LAUNCHER_TASKS, 'Ich möchte einen Arztbrief schreiben', {
      localize: localizeDe,
    })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.task.id).toBe('arztbrief')
  })

  it('maps spoken "Verlauf documentieren" to the Verlauf task', () => {
    const results = searchLauncher(LAUNCHER_TASKS, 'Verlauf documentieren', {
      localize: localizeDe,
    })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.task.id).toBe('verlauf')
  })

  it('maps a spoken multi-word phrase to psychopath findings', () => {
    const results = searchLauncher(LAUNCHER_TASKS, 'psychopathologischer Befund erheben', {
      localize: localizeDe,
    })
    const taskIds = results.filter((r) => r.type === 'task').map((r) => r.task.id)
    expect(taskIds).toContain('psychopath')
    expect(results[0]?.task.id).toBe('psychopath')
  })

  it('maps a spoken English sentence to the medication task', () => {
    const results = searchLauncher(LAUNCHER_TASKS, 'I want to add a new medication', {
      localize: (k) => translateUi('en', k),
    })
    const taskIds = results.filter((r) => r.type === 'task').map((r) => r.task.id)
    expect(taskIds).toContain('medikation')
  })

  it('respects the isModeEnabled filter (language-gated modes)', () => {
    const enOnly = searchLauncher(LAUNCHER_TASKS, 'discharge', {
      localize: (k) => translateUi('en', k),
      isModeEnabled: (_t, m: LauncherCreationMode) => m.languageOnly !== 'en',
    })
    const hasDischarge = enOnly.some((r) => r.type === 'mode' && r.mode.id === 'discharge-summary')
    expect(hasDischarge).toBe(false)
  })

  it('honours the result limit', () => {
    const results = searchLauncher(LAUNCHER_TASKS, 'e', { localize: localizeDe, limit: 5 })
    expect(results.length).toBeLessThanOrEqual(5)
  })
})

import { describe, it, expect } from 'vitest'
import { defaultWorkspaceComponents } from '../../../data/defaultWorkspaceComponents'
import { DEFAULT_COMPONENT_IDS } from '../../../utils/defaultComponents'
import { localizeWorkspaceComponents } from '../../../utils/localizeComponents'

/**
 * Regression guard: Settings → Workspace → Components must not leak German into
 * an English UI. Default component templates are stored with German canonical
 * labels; display must go through localizeWorkspaceComponents (same path as the
 * clinical workspace rail).
 */

const GERMAN_LEAK =
  /[äöüÄÖÜß]|\b(?:Aufnahme|Verlauf|Psychopatholog|Freitext|Abschnitte|Kurznotiz|Breiter|Medikation|Therapieplanung|Therapie und Verlauf|Arztbrief|Neue Komponente)\b/

const EXPECTED_EN_LABELS: Record<string, string> = {
  aufnahme: 'Admission',
  verlauf: 'Progress Note',
  psychopath: 'Mental State Examination',
  'therapie-verlauf': 'Discharge letter',
  medikation: 'Medication',
  therapieplanung: 'Therapy planning',
}

const EXPECTED_DE_LABELS: Record<string, string> = {
  aufnahme: 'Aufnahme',
  verlauf: 'Verlauf',
  psychopath: 'Psychopathologischer Befund',
  'therapie-verlauf': 'Arztbrief',
  medikation: 'Medikation',
  therapieplanung: 'Therapieplanung',
}

describe('Workspace settings component localization', () => {
  it('English UI resolves default component names to English', () => {
    const localized = localizeWorkspaceComponents(defaultWorkspaceComponents, 'en', 'uk')
    const offenders: Array<{ id: string; label: string }> = []

    for (const component of localized) {
      if (!DEFAULT_COMPONENT_IDS.includes(component.id as (typeof DEFAULT_COMPONENT_IDS)[number])) {
        continue
      }
      if (GERMAN_LEAK.test(component.label)) {
        offenders.push({ id: component.id, label: component.label })
      }
      expect(component.label, `EN label for ${component.id}`).toBe(EXPECTED_EN_LABELS[component.id])
    }

    expect(offenders, `German leak in EN workspace components: ${JSON.stringify(offenders)}`).toEqual(
      [],
    )
  })

  it('English UI localizes default variant summaries (aufnahme, verlauf, psychopath)', () => {
    const localized = localizeWorkspaceComponents(defaultWorkspaceComponents, 'en', 'uk')
    const aufnahme = localized.find((component) => component.id === 'aufnahme')
    const verlauf = localized.find((component) => component.id === 'verlauf')
    const psychopath = localized.find((component) => component.id === 'psychopath')

    expect(aufnahme?.variants?.map((variant) => variant.label)).toEqual(['Sections', 'Free text'])
    expect(verlauf?.variants?.map((variant) => variant.label)).toEqual([
      'Short Note',
      'Detailed Progress',
    ])
    expect(psychopath?.variants?.map((variant) => variant.label)).toEqual([
      'Free text',
      'Structured examination',
      'ISDM V.1',
    ])
  })

  it('legacy therapie-verlauf German label still resolves to English', () => {
    const legacy = defaultWorkspaceComponents.map((component) =>
      component.id === 'therapie-verlauf'
        ? { ...component, label: 'Therapie und Verlauf', railHeading: 'Therapie und Verlauf' }
        : component,
    )
    const [localized] = localizeWorkspaceComponents(legacy, 'en', 'uk').filter(
      (component) => component.id === 'therapie-verlauf',
    )
    expect(localized?.label).toBe('Discharge letter')
  })

  it('German UI keeps German default component names', () => {
    const localized = localizeWorkspaceComponents(defaultWorkspaceComponents, 'de', 'uk')

    for (const component of localized) {
      if (!DEFAULT_COMPONENT_IDS.includes(component.id as (typeof DEFAULT_COMPONENT_IDS)[number])) {
        continue
      }
      expect(component.label, `DE label for ${component.id}`).toBe(EXPECTED_DE_LABELS[component.id])
    }
  })
})

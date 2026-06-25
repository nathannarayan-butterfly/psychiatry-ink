import { describe, expect, it } from 'vitest'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import { buildGuidedSteps, validateGuidedStep } from '../stepEngine'
import { generateGuidedNarrative } from '../generateNarrative'

describe('guidedEntry stepEngine', () => {
  it('builds conditional risk step when risikoPresent is true', () => {
    const schema = getGuidedEntrySchema('verlauf-broad')
    const without = buildGuidedSteps(schema, { risikoPresent: false })
    const withRisk = buildGuidedSteps(schema, { risikoPresent: true })
    expect(without.some((s) => s.id === 'risiko')).toBe(true)
    expect(withRisk.find((s) => s.id === 'risiko')?.fields.some((f) => f.id === 'risikoDetails')).toBe(
      true,
    )
  })

  it('validates required fields on verlauf short context step', () => {
    const schema = getGuidedEntrySchema('verlauf-short')
    const steps = buildGuidedSteps(schema, {})
    const context = steps[0]!
    expect(validateGuidedStep(context, {})).toContain('visitDate')
    expect(
      validateGuidedStep(context, {
        visitDate: '2026-06-24',
        setting: 'ward_round',
      }),
    ).toHaveLength(0)
  })

  it('builds full AMDP psychopath finding workflow from workspace', () => {
    const schema = getGuidedEntrySchema('psychopath-finding')
    const steps = buildGuidedSteps(schema, {})
    expect(steps.length).toBe(12)
    expect(steps[0]?.id).toBe('exam-date')
    expect(steps.some((step) => step.id === 'bewusstsein')).toBe(true)
    expect(steps.some((step) => step.id === 'sozialverhalten')).toBe(true)
  })

  it('keeps compact psychopath quick schema for overview Schnellaktion', () => {
    const schema = getGuidedEntrySchema('psychopath-quick')
    const steps = buildGuidedSteps(schema, {})
    expect(steps.length).toBe(1)
  })
})

describe('generateGuidedNarrative', () => {
  it('assembles verlauf short note from structured answers', () => {
    const schema = getGuidedEntrySchema('verlauf-short')
    const { text } = generateGuidedNarrative(
      schema,
      {
        visitDate: '2026-06-24',
        setting: 'ward_round',
        subjective: 'Patient berichtet über erholsamen Schlaf.',
        plan: 'Medikation unverändert, Visite in zwei Tagen.',
      },
      'de',
    )
    expect(text).toContain('Patient berichtet')
    expect(text).toContain('Medikation unverändert')
  })

  it('includes suicide measures segment when risk elevated', () => {
    const schema = getGuidedEntrySchema('verlauf-risiko')
    const { text } = generateGuidedNarrative(
      schema,
      {
        assessmentDate: '2026-06-24',
        suicideRisk: 'moderate',
        suicideMeasures: ['observation', 'contract'],
        violenceRisk: 'none',
        summary: 'Erhöhte Observation und Sicherungsgespräch vereinbart.',
      },
      'de',
    )
    expect(text).toContain('Erhöhte Observation')
    expect(text).toContain('Sicherungsgespräch')
  })
})

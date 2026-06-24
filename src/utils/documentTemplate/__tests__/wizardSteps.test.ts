import { describe, expect, it } from 'vitest'
import { buildAnhoerungTemplate } from '../../../data/documentTemplate/anhoerungTemplate'
import { buildWizardSteps, getVisibleWizardFields, validateWizardStep } from '../wizardSteps'

describe('wizardSteps', () => {
  const template = buildAnhoerungTemplate()

  it('builds section-based steps for Anhörung template', () => {
    const values: Record<string, string | boolean | string[]> = {
      'anhoerung-conducted': 'yes',
      'anhoerung-harm-health': false,
    }
    const steps = buildWizardSteps(template, values)
    expect(steps.length).toBeGreaterThanOrEqual(4)
    expect(steps[0]?.title).toBe('Betroffene Person')
  })

  it('hides harm section when checkbox unchecked', () => {
    const values: Record<string, string | boolean | string[]> = {
      'anhoerung-harm-health': false,
    }
    const visible = getVisibleWizardFields(template, values)
    expect(visible.some((f) => f.id === 'anhoerung-harm-justification')).toBe(false)
  })

  it('shows harm justification when health harm checked', () => {
    const values: Record<string, string | boolean | string[]> = {
      'anhoerung-harm-health': true,
    }
    const visible = getVisibleWizardFields(template, values)
    expect(visible.some((f) => f.id === 'anhoerung-harm-justification')).toBe(true)
    const steps = buildWizardSteps(template, values)
    const harmStep = steps.find((s) => s.title === 'Gesundheitsgefährdung')
    expect(harmStep?.fieldIds).toContain('anhoerung-harm-justification')
  })

  it('validates required fields on a step', () => {
    const step = buildWizardSteps(template, {})[0]!
    const errors = validateWizardStep(template, step, {})
    expect(errors.length).toBeGreaterThan(0)
  })
})

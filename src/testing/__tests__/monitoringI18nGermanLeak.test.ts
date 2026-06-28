import { describe, expect, it } from 'vitest'
import { getAllDrugReferences } from '../../data/psychDrugReference/index'
import { localizeMonitoringRule } from '../../data/psychDrugReference/monitoringI18n'
import { findGermanTokens } from '../germanLeak'

/**
 * Guardrail C (reference data): the psychopharmacology monitoring reference is
 * authored German-first, and the medication "Brief Info"/intelligence card renders
 * `monitoringRules[].parameter / .frequency / .warningThreshold / .noteEn`.
 *
 * This test runs the SAME render-layer localiser the UI uses (`localizeMonitoringRule`)
 * over EVERY monitoring rule of EVERY drug in the reference DB, and asserts the
 * English output is German-free. Because an unmapped value falls back to the German
 * source, any newly added German monitoring string fails CI until its English
 * translation is added to `monitoringI18n.ts` — making the fix permanent.
 */

const drugs = getAllDrugReferences()

describe('Guardrail C — psychDrugReference monitoring is English-clean (en locale)', () => {
  it('has reference drugs with monitoring rules to check', () => {
    const totalRules = drugs.reduce((n, d) => n + d.monitoringRules.length, 0)
    expect(drugs.length).toBeGreaterThan(50)
    expect(totalRules).toBeGreaterThan(100)
  })

  it('produces no German tokens for any English-localised monitoring rule', () => {
    const leaks: string[] = []
    for (const drug of drugs) {
      for (const rule of drug.monitoringRules) {
        const en = localizeMonitoringRule(rule, 'en')
        for (const [field, value] of [
          ['parameter', en.parameter],
          ['frequency', en.frequency],
          ['warningThreshold', en.warningThreshold],
          ['note', en.note],
        ] as const) {
          if (!value) continue
          const tokens = findGermanTokens(value)
          if (tokens.length > 0) {
            leaks.push(
              `${drug.genericName} → monitoringRules.${field}: "${value}" [${tokens.join(', ')}]`,
            )
          }
        }
      }
    }
    expect(leaks, `German leaked into English monitoring data:\n${leaks.join('\n')}`).toEqual([])
  })
})

describe('Guardrail C control — German locale stays German', () => {
  it('keeps the original German parameter strings for the de locale', () => {
    // Pick a rule that we know carries a German parameter and assert de passes it through.
    const withParam = drugs
      .flatMap((d) => d.monitoringRules)
      .find((r) => /[äöüß]/i.test(r.parameter) || /Blutbild|Leberwerte|Herzfrequenz/.test(r.parameter))
    expect(withParam).toBeDefined()
    if (!withParam) return
    const de = localizeMonitoringRule(withParam, 'de')
    expect(de.parameter).toBe(withParam.parameter)
  })
})

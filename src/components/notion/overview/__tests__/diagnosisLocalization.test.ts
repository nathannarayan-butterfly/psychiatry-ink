import { describe, expect, it } from 'vitest'
import { translateUi, type UiTranslationKey } from '../../../../data/uiTranslations'
import { buildDemoPatientFixture } from '../../../../demo/buildDemoFixture'
import { matchDisorderToCodes } from '../../../../data/diagnosisCriteria/match'
import { getLocalizedDisorder } from '../../../../data/diagnosisCriteria/i18n'
import { resolveDisorderForCodingSystem } from '../../../../data/diagnosisCriteria/version'
import { buildEvaluationContext } from '../../../../utils/diagnosisCriteria/context'
import { evaluateDisorder } from '../../../../utils/diagnosisCriteria/evaluateDisorder'
import { buildDisorderAdvice } from '../../../../utils/diagnosisCriteria/advice'
import { buildButterflySummary } from '../../../../utils/overview/butterflySummary'
import { applyIsdmAnalysis, clearIsdmCache } from '../../../../utils/isdm/storage'
import { saveDiagnosen } from '../../../../utils/diagnosenArchive'
import { saveDiagnosenCodingSystem } from '../../../../utils/diagnosenCodingSystem'
import type { AttestationMap } from '../../../../utils/diagnosisCriteria/context'
import enFixtureJson from '../../../../demo/demoPatient.en.fixture.json'

function demoAttestations(fixture: ReturnType<typeof buildDemoPatientFixture>): AttestationMap {
  const out: AttestationMap = {}
  for (const [key, record] of Object.entries(fixture.workspace.butterflyAttestations ?? {})) {
    out[key] = record.value
  }
  return out
}

/**
 * Regression guard: the Diagnosis tab (DiagnosenWidget + Butterfly criteria
 * support) must not leak German into an English UI. Marcus demo (DEMO-CASE-EN-0001)
 * opens this area directly.
 */

const GERMAN_LEAK =
  /[äöüÄÖÜß]|\b(?:Laut|Kriterien|Diagnose|Diagnosen|Störung|Kriterium|erfüllt|nicht erfüllt|bitte prüfen|bitte klinisch|Datenlage|Differenzial|Vorgeschlagene|Belege|Unklar|Ja\b|Nein\b|Empfehlungen|Hauptdiagnose|Nebendiagnose|Abhängigkeit|Schizophrenie|Wahn|Halluzination|Entzug|Toleranz|Verlangen|Befunde)\b/

const BUTTERFLY_EN_KEYS: UiTranslationKey[] = [
  'butterflyTitle',
  'butterflySubtitle',
  'butterflyIdle',
  'butterflyIdleNoDiagnosis',
  'butterflyNoDiagnosisHint',
  'butterflyCriteriaUnavailable',
  'butterflyIdleHint',
  'butterflyRecommendations',
  'butterflyVerdictMet',
  'butterflyVerdictNotMet',
  'butterflyVerdictInsufficient',
  'butterflyAdviceCriteriaMet',
  'butterflyAdviceNotMet',
  'butterflyAdviceInsufficient',
  'butterflyCriteriaMetLabel',
  'butterflyOpenCriteria',
  'butterflyAttestMet',
  'butterflyAttestNotMet',
  'butterflyAttestHint',
  'butterflySource',
  'butterflyDifferentials',
  'butterflyQuestions',
  'butterflyQuestionPrompt',
  'butterflyQuestionRationale',
  'butterflyQuestionAnswerHint',
  'butterflyQuestionSectionHint',
  'butterflyInterviewIntro',
  'butterflyInterviewFallback1',
  'butterflyInterviewFallback2',
  'butterflyQuestionYes',
  'butterflyQuestionNo',
  'butterflyQuestionUnclear',
  'butterflyQuestionNotePlaceholder',
  'butterflyQuestionAnswerSaved',
  'butterflyCriterionReset',
  'butterflyCriteriaProvenanceTitle',
  'butterflyProvenanceDeterministic',
  'butterflyProvenanceConfirmed',
  'butterflyProvenanceAi',
  'butterflyProvenanceOpen',
  'butterflyAskTemplate',
  'butterflyOpenCriteriaHint',
  'butterflyAttestUnclear',
  'butterflyJumpToDoc',
  'butterflyCheckAi',
  'butterflyChecking',
  'butterflyAiSuggestionMet',
  'butterflyAiSuggestionNotMet',
  'butterflyAiUnclear',
  'butterflyAiQuoteLabel',
  'butterflyAiConfidence',
  'butterflyAccept',
  'butterflyDismiss',
  'butterflyAiError',
  'butterflyAiPendingNote',
  'overviewWidgetButterflyCriteria',
  'overviewButterflyOpenDiagnose',
  'overviewButterflyEmpty',
  'overviewButterflyVerdictCriteriaMet',
  'overviewButterflyVerdictNotMet',
  'overviewButterflyVerdictInsufficientData',
  'overviewButterflyVerdictUnavailable',
  'overviewButterflyOpenBadge',
  'overviewWidgetDiagnoses',
  'topNavDiagnose',
  'diagnosenTitle',
  'diagnosenAddEntry',
  'diagnosenEmpty',
  'diagnosisTableColCode',
  'diagnosisTableColName',
  'diagnosisTableColStatus',
  'diagnosisCategoryPrimary',
  'diagnosisCategorySecondary',
  'diagnosisConfirmationConfirmed',
  'diagnosisConfirmationActive',
]

describe('Diagnosis / Butterfly English localization', () => {
  it('every Butterfly and Diagnosen UI string resolves to non-German English', () => {
    const offenders: Array<{ key: string; value: string }> = []
    for (const key of BUTTERFLY_EN_KEYS) {
      const value = translateUi('en', key)
      if (GERMAN_LEAK.test(value)) {
        offenders.push({ key, value })
      }
    }
    expect(offenders, `German leak in EN diagnosis strings: ${JSON.stringify(offenders)}`).toEqual([])
  })

  it('English demo Butterfly advice headlines and criteria text are not German', () => {
    const fixture = buildDemoPatientFixture('en')
    const analysis = fixture.workspace.isdmAnalysis
    expect(analysis).toBeDefined()

    const ctx = buildEvaluationContext({
      phenomenology: analysis!.phenomenology,
      coursePattern: analysis!.coursePattern,
      attestations: demoAttestations(fixture),
    })

    for (const dx of fixture.workspace.diagnoses) {
      const source = matchDisorderToCodes(dx.icd10.code, dx.icd11.code)
      if (!source) continue

      for (const icdVersion of ['icd10', 'icd11'] as const) {
        const versioned = resolveDisorderForCodingSystem(source, icdVersion)
        const disorder = getLocalizedDisorder(versioned, 'en')
        const evaluation = evaluateDisorder(disorder, ctx)
        const advice = buildDisorderAdvice(evaluation, disorder, 'en')

        expect(
          GERMAN_LEAK.test(advice.headline),
          `German advice headline for ${dx.icd10.code} (${icdVersion}): ${advice.headline}`,
        ).toBe(false)
        if (advice.tone === 'insufficient') {
          expect(advice.headline).toMatch(/Not enough structured data/)
        } else {
          expect(advice.headline).toMatch(/According to ICD/)
        }

        for (const criterion of evaluation.perCriterion) {
          expect(
            GERMAN_LEAK.test(criterion.text_de),
            `German criterion ${criterion.criterionId}: ${criterion.text_de}`,
          ).toBe(false)
        }

        for (const group of disorder.groups) {
          expect(
            GERMAN_LEAK.test(group.label_de),
            `German group label ${group.id}: ${group.label_de}`,
          ).toBe(false)
        }

        for (const differential of disorder.differentials_de) {
          expect(
            GERMAN_LEAK.test(differential),
            `German differential: ${differential}`,
          ).toBe(false)
        }
      }
    }
  })

  it('English demo diagnosis labels in fixture are not German', () => {
    for (const dx of enFixtureJson.workspace.diagnoses) {
      for (const slot of [dx.icd10, dx.icd11, dx.dsm]) {
        if (slot.label.trim()) {
          expect(GERMAN_LEAK.test(slot.label), `German label: ${slot.label}`).toBe(false)
        }
      }
    }
  })

  it('control: German locale still renders German Butterfly advice', () => {
    const fixture = buildDemoPatientFixture('de')
    const analysis = fixture.workspace.isdmAnalysis!
    const ctx = buildEvaluationContext({
      phenomenology: analysis.phenomenology,
      coursePattern: analysis.coursePattern,
      attestations: demoAttestations(fixture),
    })
    const f20 = fixture.workspace.diagnoses.find((d) => d.icd10.code === 'F20.0')!
    const source = matchDisorderToCodes(f20.icd10.code, f20.icd11.code)!
    const disorder = getLocalizedDisorder(resolveDisorderForCodingSystem(source, 'icd10'), 'de')
    const evaluation = evaluateDisorder(disorder, ctx)
    const advice = buildDisorderAdvice(evaluation, disorder, 'de')
    expect(advice.headline).toMatch(/Laut ICD-10/)
    expect(advice.headline).toMatch(/bitte klinisch bestätigen|prüfen|ergänzen/i)
  })
})

describe('buildButterflySummary English headlines', () => {
  it('returns English advice headlines when seeded with EN demo data', () => {
    const fixture = buildDemoPatientFixture('en')
    const caseId = fixture.demoCaseId

    applyIsdmAnalysis(fixture.workspace.isdmAnalysis!, caseId)
    saveDiagnosen(caseId, fixture.workspace.diagnoses)
    saveDiagnosenCodingSystem(caseId, 'icd10')
    localStorage.setItem(
      `butterfly-attestations:${caseId}`,
      JSON.stringify(fixture.workspace.butterflyAttestations ?? {}),
    )

    try {
      const items = buildButterflySummary(caseId, 'en')
      expect(items.length).toBeGreaterThan(0)
      for (const item of items) {
        if (item.headline) {
          expect(GERMAN_LEAK.test(item.headline), item.headline).toBe(false)
          expect(item.headline).toMatch(/According to ICD|Not enough structured data/)
        }
      }
    } finally {
      clearIsdmCache(caseId)
      saveDiagnosen(caseId, [])
      localStorage.removeItem(`butterfly-attestations:${caseId}`)
    }
  })
})

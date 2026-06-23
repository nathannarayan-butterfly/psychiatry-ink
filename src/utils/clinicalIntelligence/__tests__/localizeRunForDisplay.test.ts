import { describe, it, expect } from 'vitest'
import { buildDemoClinicalIntelligenceState } from '../../../demo/buildDemoClinicalIntelligence'
import {
  formatCiEvidenceSourceList,
  getCiEvidenceSourceLabel,
} from '../../../data/clinicalIntelligenceTranslations'
import {
  isDemoClinicalIntelligenceRun,
  localizeClinicalIntelligenceRunForDisplay,
} from '../localizeRunForDisplay'

describe('localizeClinicalIntelligenceRunForDisplay', () => {
  const demoRun = buildDemoClinicalIntelligenceState().latestRun!

  it('detects pre-baked demo runs', () => {
    expect(isDemoClinicalIntelligenceRun(demoRun)).toBe(true)
  })

  it('returns German narratives for DE users on demo runs', () => {
    const localized = localizeClinicalIntelligenceRunForDisplay(demoRun, 'de')
    const salience = localized.dimensional.activeDimensions.find(
      (d) => d.dimensionId === 'aberrant-salience-psychotic-meaning',
    )
    expect(salience?.clinicalSummary).toContain('Verfolgungs')
    expect(salience?.longitudinalPattern).toContain('2 Wochen')
    expect(salience?.uncertainty).toContain('Substanzen')
    expect(salience?.missingData).toContain('Kollateralanamnese')
  })

  it('preserves English when language is EN', () => {
    const localized = localizeClinicalIntelligenceRunForDisplay(demoRun, 'en')
    const salience = localized.dimensional.activeDimensions.find(
      (d) => d.dimensionId === 'aberrant-salience-psychotic-meaning',
    )
    expect(salience?.clinicalSummary).toContain('Persistent persecutory')
  })

  it('localizes mechanism treatment text in French', () => {
    const localized = localizeClinicalIntelligenceRunForDisplay(demoRun, 'fr')
    const dopamine = localized.mechanism.activeMechanisms.find(
      (m) => m.mechanismId === 'dopamine-aberrant-salience-dysregulation',
    )
    expect(dopamine?.clinicalImplication).toContain('Symptômes positifs')
    expect(dopamine?.treatmentRelevance).toContain('aripiprazole')
  })

  it('localizes dimensional exploratory notes', () => {
    const localized = localizeClinicalIntelligenceRunForDisplay(demoRun, 'de')
    expect(localized.dimensional.exploratoryInsufficientEvidence[0]?.topic).toContain('Trauma')
    expect(localized.dimensional.exploratoryInsufficientEvidence[0]?.rationale).toContain(
      'Traumanamnese',
    )
  })

  it('does not overwrite clinician-edited findings', () => {
    const editedRun = {
      ...demoRun,
      dimensional: {
        ...demoRun.dimensional,
        activeDimensions: demoRun.dimensional.activeDimensions.map((finding) =>
          finding.dimensionId === 'aberrant-salience-psychotic-meaning'
            ? {
                ...finding,
                reviewStatus: 'edited' as const,
                clinicalSummary: 'Clinician override text',
              }
            : finding,
        ),
      },
    }
    const localized = localizeClinicalIntelligenceRunForDisplay(editedRun, 'de')
    const salience = localized.dimensional.activeDimensions.find(
      (d) => d.dimensionId === 'aberrant-salience-psychotic-meaning',
    )
    expect(salience?.clinicalSummary).toBe('Clinician override text')
  })
})

describe('getCiEvidenceSourceLabel', () => {
  it('maps discuss-package section keys', () => {
    expect(getCiEvidenceSourceLabel('diagnosis', 'de')).toBe('Diagnose')
    expect(getCiEvidenceSourceLabel('therapie-verlauf', 'en')).toBe('Therapy and course')
    expect(getCiEvidenceSourceLabel('medication', 'fr')).toBe('Médication')
  })

  it('maps document-type evidence ids used in demo data', () => {
    expect(getCiEvidenceSourceLabel('aufnahme', 'de')).toBe('Aufnahme')
    expect(getCiEvidenceSourceLabel('aufnahme', 'en')).toBe('Admission')
  })

  it('formats comma-separated evidence lists', () => {
    expect(
      formatCiEvidenceSourceList(['aufnahme', 'therapie-verlauf', 'diagnosis'], 'de'),
    ).toBe('Aufnahme, Therapie und Verlauf, Diagnose')
  })
})

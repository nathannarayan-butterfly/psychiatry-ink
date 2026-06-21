import { describe, expect, it, vi } from 'vitest'

vi.mock('../kbTemplateStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../kbTemplateStorage')>()
  return {
    ...actual,
    getMedicationEducationKbTemplate: vi.fn().mockResolvedValue(null),
  }
})

vi.mock('../combinationCheck/storage', () => ({
  loadCombinationCheckStore: vi.fn().mockReturnValue({ findings: [] }),
}))
import {
  getMedicationEducationSectionIds,
  isCombinationScope,
  resolveDocumentVariant,
  sectionCountForScope,
} from '../../../data/medicationEducationSections'
import { buildMedicationEducationEvidenceBundle, scrubEvidenceText } from '../evidenceBundle'
import { assessKbTemplateCompleteness } from '../kbCompleteness'
import { validateCombinationSynthesisFlag } from '../combinationSynthesis'
import { createMedicationEducationDocument, isSectionIncludedInFinal } from '../draftOps'
import { assembleMedicationEducationText } from '../export'
import { createEmptyKbTemplate } from '../kbTemplateStorage'

describe('medication education section ordering', () => {
  it('single scope has 14 sections without pregnancy', () => {
    const ids = getMedicationEducationSectionIds('single')
    expect(ids).toHaveLength(14)
    expect(ids[0]).toBe('titel')
    expect(ids[ids.length - 1]).toBe('arzt-bestaetigung')
  })

  it('single scope has 15 sections with pregnancy', () => {
    expect(sectionCountForScope('single', true)).toBe(15)
  })

  it('combination scope has 14 sections', () => {
    const ids = getMedicationEducationSectionIds('full_combination')
    expect(ids).toHaveLength(14)
    expect(ids[2]).toBe('aktuelle-medikation-tabelle')
    expect(ids[6]).toBe('haeufige-nebenwirkungen-kombination')
  })

  it('selected scope is treated as combination', () => {
    expect(isCombinationScope('selected')).toBe(true)
    expect(resolveDocumentVariant('selected', 'standard')).toBe('patient_combination')
  })
})

describe('evidence bundle de-id', () => {
  it('flags isDeidentified and scrubs patient name from text', async () => {
    const bundle = await buildMedicationEducationEvidenceBundle({
      scope: 'single',
      documentVariant: 'patient_single',
      detailStyle: 'standard',
      language: 'de',
      medications: [
        {
          id: 'm1',
          substance: 'Quetiapin',
          formulation: 'tablet',
          strength: '100 mg',
          doseSchedule: { morning: '0', noon: '0', evening: '1', night: '0', unit: 'Tbl' },
          doseLineGerman: '0-0-0-1',
          prn: false,
          startDate: '2024-01-01',
          indication: 'Schlaf',
          status: 'active',
          sideEffects: [],
          adherenceNote: '',
          reasonForChange: '',
          introducedAt: '',
          lastChangeAt: '',
          lastChangeType: 'start',
          history: [],
          freeTextLine: '',
        },
      ],
      patientName: 'Max Mustermann',
    })
    expect(bundle.isDeidentified).toBe(true)
    const scrubbed = scrubEvidenceText('Patient Max Mustermann am 12.03.2024', 'Max Mustermann')
    expect(scrubbed).not.toContain('Max Mustermann')
    expect(scrubbed).toContain('[DATUM]')
  })

  it('requires combination synthesis for multi-med combination scope', async () => {
    const bundle = await buildMedicationEducationEvidenceBundle({
      scope: 'full_combination',
      documentVariant: 'patient_combination',
      detailStyle: 'standard',
      language: 'de',
      medications: [
        {
          id: 'm1',
          substance: 'A',
          formulation: 'tablet',
          strength: '1 mg',
          doseSchedule: { morning: '1', noon: '0', evening: '0', night: '0', unit: 'Tbl' },
          doseLineGerman: '1-0-0-0',
          prn: false,
          startDate: '',
          indication: '',
          status: 'active',
          sideEffects: [],
          adherenceNote: '',
          reasonForChange: '',
          introducedAt: '',
          lastChangeAt: '',
          lastChangeType: 'start',
          history: [],
          freeTextLine: '',
        },
        {
          id: 'm2',
          substance: 'B',
          formulation: 'tablet',
          strength: '2 mg',
          doseSchedule: { morning: '0', noon: '0', evening: '1', night: '0', unit: 'Tbl' },
          doseLineGerman: '0-0-1-0',
          prn: false,
          startDate: '',
          indication: '',
          status: 'active',
          sideEffects: [],
          adherenceNote: '',
          reasonForChange: '',
          introducedAt: '',
          lastChangeAt: '',
          lastChangeType: 'start',
          history: [],
          freeTextLine: '',
        },
      ],
    })
    expect(bundle.requiresCombinationSynthesis).toBe(true)
    expect(validateCombinationSynthesisFlag(bundle)).toBe(true)
  })
})

describe('KB completeness', () => {
  it('marks empty template as insufficient', () => {
    const t = createEmptyKbTemplate({ medicationId: 'drug-1', substanceName: 'Test' })
    const result = assessKbTemplateCompleteness(t)
    expect(result.isSufficientForAi).toBe(false)
    expect(result.missingFields.length).toBeGreaterThan(0)
  })

  it('marks filled required fields as sufficient', () => {
    const t = {
      ...createEmptyKbTemplate({ medicationId: 'drug-1', substanceName: 'Test' }),
      mechanismSimple: 'Wirkt auf Rezeptoren.',
      commonSideEffects: 'Müdigkeit',
      seriousWarnings: 'Allergische Reaktion',
      monitoringRequirements: 'Blutbild',
      howToTake: 'Abends 1 Tablette',
    }
    const result = assessKbTemplateCompleteness(t)
    expect(result.isSufficientForAi).toBe(true)
  })
})

describe('export assembly', () => {
  it('includes only accepted sections with content', () => {
    const doc = createMedicationEducationDocument({
      scope: 'single',
      detailStyle: 'standard',
      language: 'de',
      aiMode: 'standard',
      medicationIds: ['m1'],
    })
    doc.sections['kurze-zusammenfassung'].currentContent = 'Kurzfassung'
    doc.sections['kurze-zusammenfassung'].status = 'accepted'

    const labels = { 'kurze-zusammenfassung': 'Kurze Zusammenfassung' }
    const text = assembleMedicationEducationText(doc, labels)
    expect(text).toContain('Kurzfassung')

    doc.sections['wie-wirkt'].currentContent = 'Wirkung'
    doc.sections['wie-wirkt'].status = 'ai_generated'
    expect(isSectionIncludedInFinal(doc.sections['wie-wirkt'])).toBe(false)
    const text2 = assembleMedicationEducationText(doc, labels)
    expect(text2).not.toContain('Wirkung')
  })
})

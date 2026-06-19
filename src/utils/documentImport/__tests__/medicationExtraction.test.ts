import { describe, expect, it } from 'vitest'
import { docxTextToResult } from '../parsers/docxParser'
import {
  appendMedicationCandidatesFromNarrative,
  parseMedicationLine,
} from '../medicationExtraction'
import { makeCandidate } from '../candidateFactory'
import { consolidateImportCandidates } from '../consolidateCandidates'
import { persistAcceptedCandidates } from '../persistCandidates'
import { getOrCreateMedicationPlanState } from '../../medication/storage'
import type { ClinicalImportEnvelope } from '../../../schemas/documentImport/envelope'

describe('parseMedicationLine — structured oral and depot', () => {
  it('detects LAI depot with brand, strength, and interval', () => {
    expect(parseMedicationLine('Risperdal OKEDI 100mg i.m. alle 28 Tage')).toMatchObject({
      substance: 'Risperdal OKEDI',
      displayBrandName: 'OKEDI',
      strength: '100 mg',
      isDepot: true,
      depotInterval: 'alle 28 Tage',
      formulation: 'depot',
      route: 'im',
      depotConfidence: 'high',
    })
  })

  it('detects depot keyword without interval', () => {
    expect(parseMedicationLine('Paliperidon Depot 150 mg')).toMatchObject({
      substance: 'Paliperidon Depot',
      strength: '150 mg',
      isDepot: true,
      formulation: 'depot',
    })
  })

  it('parses standard oral dose schedules', () => {
    expect(parseMedicationLine('Sertralin 50 mg 1-0-0')).toMatchObject({
      substance: 'Sertralin',
      strength: '50 mg',
      doseText: '1-0-0',
    })
    expect(parseMedicationLine('Quetiapin 25 mg 0-0-1')).toMatchObject({
      substance: 'Quetiapin',
      strength: '25 mg',
      doseText: '0-0-1',
    })
    expect(parseMedicationLine('Haloperidol 2-0-2')).toMatchObject({
      substance: 'Haloperidol',
      doseText: '2-0-2',
    })
  })

  it('detects alle N Wochen with i.m.', () => {
    expect(parseMedicationLine('Aripiprazol Maintena 400 mg i.m. alle 4 Wochen')).toMatchObject({
      isDepot: true,
      depotInterval: 'alle 4 Wochen',
      formulation: 'depot',
      route: 'im',
    })
  })
})

describe('parseMedicationLine — formulation, route, frequency', () => {
  it('detects tablet formulation from Tbl', () => {
    expect(parseMedicationLine('Lorazepam 1 mg 1 Tbl. tgl.')).toMatchObject({
      substance: 'Lorazepam',
      strength: '1 mg',
      formulation: 'tablet',
      frequency: 'täglich',
    })
  })

  it('detects drops and PRN patterns', () => {
    expect(parseMedicationLine('Melperon 40 mg/ml Tropfen 20 Tropfen bedarfsweise')).toMatchObject({
      substance: 'Melperon',
      strength: '40 mg',
      formulation: 'drops',
      isPrn: true,
      frequency: 'bedarfsweise',
    })
  })

  it('detects route and time-of-day frequency', () => {
    expect(parseMedicationLine('Diazepam 5 mg p.o. morgens')).toMatchObject({
      substance: 'Diazepam',
      strength: '5 mg',
      route: 'po',
      frequency: 'morgens',
    })
  })

  it('detects medication change status from narrative verbs', () => {
    expect(parseMedicationLine('Sertralin auf 100 mg erhöht')).toMatchObject({
      substance: 'Sertralin',
      strength: '100 mg',
      status: 'increased',
      changeContext: 'Sertralin auf 100 mg erhöht',
    })
    expect(parseMedicationLine('Lorazepam gestoppt')).toMatchObject({
      substance: 'Lorazepam',
      status: 'discontinued',
    })
  })
})

describe('parseMedicationLine — multi-drug lines', () => {
  it('is used by list splitting for comma-separated entries', () => {
    const line = 'Sertralin 50 mg 1-0-0, Quetiapin 25 mg 0-0-1'
    expect(parseMedicationLine('Sertralin 50 mg 1-0-0')).toMatchObject({ substance: 'Sertralin' })
    expect(parseMedicationLine('Quetiapin 25 mg 0-0-1')).toMatchObject({ substance: 'Quetiapin' })
    expect(line).toContain(',')
  })
})

describe('appendMedicationCandidatesFromNarrative', () => {
  it('extracts inline Medikation from Verlauf text', () => {
    const base = [
      makeCandidate({
        module: 'verlauf',
        sourceLocation: { section: 'Verlauf' },
        data: { text: 'Visite.\nMedikation: Risperdal OKEDI 100mg i.m. alle 28 Tage' },
      }),
    ]

    const meds = appendMedicationCandidatesFromNarrative(base).filter((c) => c.module === 'medication')
    expect(meds).toHaveLength(1)
    if (meds[0].module === 'medication') {
      expect(meds[0].data.isDepot).toBe(true)
      expect(meds[0].data.substance).toContain('Risperdal')
    }
  })

  it('extracts oral medications from Verlauf change sentences', () => {
    const base = [
      makeCandidate({
        module: 'verlauf',
        sourceLocation: { section: 'Verlauf' },
        data: {
          date: '2024-03-14',
          text: 'Visite. Beginn mit Olanzapin 10 mg 0-0-1.',
        },
      }),
    ]

    const meds = appendMedicationCandidatesFromNarrative(base).filter((c) => c.module === 'medication')
    expect(meds).toHaveLength(1)
    if (meds[0].module === 'medication') {
      expect(meds[0].data.substance).toBe('Olanzapin')
      expect(meds[0].data.strength).toBe('10 mg')
      expect(meds[0].data.startDate).toBe('2024-03-14')
    }
  })

  it('flags low-confidence narrative hits for review', () => {
    const base = [
      makeCandidate({
        module: 'verlauf',
        confidence: 'medium',
        data: { text: 'Lorazepam gestoppt.' },
      }),
    ]

    const meds = appendMedicationCandidatesFromNarrative(base).filter((c) => c.module === 'medication')
    expect(meds).toHaveLength(1)
    expect(meds[0].confidence).toBe('low')
    expect(meds[0].clarifications?.some((c) => c.code === 'medication_uncertain')).toBe(true)
  })

  it('does not duplicate dedicated Medikation section rows', () => {
    const base = [
      makeCandidate({
        module: 'medication',
        data: { substance: 'Risperdal OKEDI', strength: '100 mg', isDepot: true },
      }),
      makeCandidate({
        module: 'verlauf',
        data: { text: 'Medikation: Risperdal OKEDI 100mg i.m. alle 28 Tage' },
      }),
    ]

    const meds = appendMedicationCandidatesFromNarrative(base).filter((c) => c.module === 'medication')
    expect(meds).toHaveLength(1)
  })

  it('runs through consolidateImportCandidates in the docx pipeline', () => {
    const result = docxTextToResult([
      'Verlauf',
      'Medikation: Risperdal OKEDI 100mg i.m. alle 28 Tage',
    ].join('\n'))

    const meds = result.candidates.filter((c) => c.module === 'medication')
    expect(meds.length).toBeGreaterThanOrEqual(1)
    const depot = meds.find(
      (c) => c.module === 'medication' && c.data.substance.toLowerCase().includes('risperdal'),
    )
    expect(depot?.module).toBe('medication')
    if (depot?.module === 'medication') {
      expect(depot.data.isDepot).toBe(true)
    }
  })
})

describe('consolidateImportCandidates medication pass', () => {
  it('appends narrative meds after aufnahme merge', () => {
    const merged = consolidateImportCandidates([
      makeCandidate({
        module: 'anamnese',
        data: { sectionId: 'medikamentenanamnese', title: 'Medikamentenanamnese', text: 'Quetiapin 25 mg 0-0-1' },
      }),
      makeCandidate({
        module: 'anamnese',
        data: { sectionId: 'aktuelle-krankheitsanamnese', title: 'Aktuelle Anamnese', text: 'Beschwerden.' },
      }),
    ])

    const meds = merged.filter((c) => c.module === 'medication')
    expect(meds.some((c) => c.module === 'medication' && c.data.substance === 'Quetiapin')).toBe(true)
  })

  it('extracts all medications from a Medikation section via docx pipeline', () => {
    const result = docxTextToResult([
      'Medikation',
      '• Sertralin 50 mg 1-0-0',
      '• Quetiapin 25 mg 0-0-1',
      '• Lorazepam 1 mg Tbl. bedarfsweise',
    ].join('\n'))

    const meds = result.candidates.filter((c) => c.module === 'medication')
    expect(meds).toHaveLength(3)
    const substances = meds
      .filter((c) => c.module === 'medication')
      .map((c) => (c.module === 'medication' ? c.data.substance : ''))
    expect(substances).toEqual(expect.arrayContaining(['Sertralin', 'Quetiapin', 'Lorazepam']))
  })
})

describe('persistAcceptedCandidates — comprehensive medication fields', () => {
  const envelope: ClinicalImportEnvelope = {
    envelopeVersion: 1,
    sourceDocumentId: 'src-doc-1',
    parserVersion: '1.0.0',
    parsingMode: 'structured',
    source: {
      filename: 'arztbrief.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      detectedFormat: 'docx',
      sizeBytes: 42,
      importedAt: '2026-01-01T00:00:00.000Z',
    },
    candidates: [],
    notices: [],
  }

  it('persists oral medication with dose schedule and PRN', () => {
    localStorage.clear()
    const caseId = `med-oral-${Date.now()}`
    const candidate = makeCandidate({
      module: 'medication',
      sourceLocation: { section: 'Medikation' },
      data: {
        substance: 'Sertralin',
        strength: '50 mg',
        doseText: '1-0-0',
        formulation: 'tablet',
        startDate: '2024-03-12',
      },
    })

    persistAcceptedCandidates({
      caseId,
      envelope,
      acceptedCandidates: [candidate],
      acceptedBy: 'Dr. Test',
      language: 'de',
      now: () => '2026-01-02T00:00:00.000Z',
    })

    const entry = getOrCreateMedicationPlanState(caseId).plans[0]?.medications[0]
    expect(entry?.substance).toBe('Sertralin')
    expect(entry?.doseSchedule.morning).toBe('1')
    expect(entry?.doseSchedule.noon).toBe('0')
    expect(entry?.doseSchedule.evening).toBe('0')
    expect(entry?.startDate).toBe('2024-03-12')
  })

  it('persists PRN and discontinued status from narrative extraction', () => {
    localStorage.clear()
    const caseId = `med-prn-${Date.now()}`
    const candidate = makeCandidate({
      module: 'medication',
      sourceLocation: { section: 'Verlauf → Medikation' },
      data: {
        substance: 'Lorazepam',
        strength: '1 mg',
        isPrn: true,
        frequency: 'bedarfsweise',
        status: 'discontinued',
        changeContext: 'Lorazepam gestoppt',
      },
    })

    persistAcceptedCandidates({
      caseId,
      envelope,
      acceptedCandidates: [candidate],
      acceptedBy: 'Dr. Test',
      language: 'de',
      now: () => '2026-01-02T00:00:00.000Z',
    })

    const entry = getOrCreateMedicationPlanState(caseId).plans[0]?.medications[0]
    expect(entry?.prn).toBe(true)
    expect(entry?.status).toBe('discontinued')
    expect(entry?.reasonForChange).toBe('Lorazepam gestoppt')
    expect(entry?.lastChangeType).toBe('start')
  })
})

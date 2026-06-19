import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildSymptomSnapshotData,
  inferCourseDirection,
  savePsychopathFindingEdit,
  seedPsychopathFindingFromImport,
} from '../psychopathFindingOps'

vi.mock('../psychopathFindingStorage', () => ({
  loadPsychopathFindingState: vi.fn(),
  savePsychopathFindingState: vi.fn(),
}))

vi.mock('../../clinicalImprint/storage', () => ({
  upsertClinicalImprint: vi.fn(),
  imprintKeyFor: vi.fn((sourceType: string, sourceId: string) => `${sourceType}:${sourceId}`),
}))

vi.mock('../../clinicalImprint/extract', () => ({
  extractClinicalImprint: vi.fn((job) => ({
    patientId: job.caseId,
    caseId: job.caseId,
    sourceType: job.sourceType,
    sourceId: job.sourceId,
    sourceDate: job.sourceDate,
    createdAt: job.sourceDate,
    readableClinicalSentence: job.text,
    clinicalDomain: 'psychopathology',
    symptoms: [],
    severity: null,
    courseDirection: null,
    affect: null,
    drive: null,
    thoughtForm: null,
    thoughtContent: null,
    perception: null,
    selfDisturbance: null,
    cognition: null,
    sleep: null,
    cooperation: null,
    insight: null,
    riskSelf: null,
    riskOthers: null,
    aggression: null,
    suicidality: null,
    functioning: null,
    socialInteraction: null,
    hygieneSelfCare: null,
    medicationMentioned: [],
    medicationResponse: null,
    sideEffects: null,
    adherence: null,
    diagnosisHints: [],
    differentialDiagnosisHints: [],
    uncertainty: null,
    evidenceStrength: 'direct_observation',
    evidenceText: job.text,
    evidenceQuoteRange: null,
    analysisEligible: true,
    excludeReason: null,
    facts: [],
    schemaVersion: 1,
    extractorVersion: 1,
    contentHash: 'hash',
  })),
}))

vi.mock('../../clinicalImprint', () => ({
  loadClinicalImprintIndex: vi.fn(() => ({ imprints: [] })),
}))

vi.mock('../../diagnosenArchive', () => ({
  loadDiagnosen: vi.fn(() => []),
}))

vi.mock('../psychopathSnapshot', () => ({
  AUFNAHME_PSYCHOPATH_SECTION_ID: 'psychopathologischer-befund',
  resolveDocumentPsychopathologyText: vi.fn(() => ({ text: null, savedAt: null, source: null })),
}))

vi.mock('../psychopathAiExtract', () => ({
  isPsychopathAiStructuredStale: vi.fn(() => false),
}))

vi.mock('../symptomTrajectory', () => ({
  getSymptomTrajectory: vi.fn(() => []),
}))

vi.mock('../dateLabels', () => ({
  formatDateDe: vi.fn((value: string) => value.slice(0, 10)),
}))

import {
  loadPsychopathFindingState,
  savePsychopathFindingState,
} from '../psychopathFindingStorage'
import { upsertClinicalImprint } from '../../clinicalImprint/storage'
import { loadClinicalImprintIndex } from '../../clinicalImprint'

const mockLoadState = vi.mocked(loadPsychopathFindingState)
const mockSaveState = vi.mocked(savePsychopathFindingState)
const mockUpsert = vi.mocked(upsertClinicalImprint)
const mockLoadImprints = vi.mocked(loadClinicalImprintIndex)

describe('inferCourseDirection', () => {
  it('detects improvement and worsening phrases', () => {
    expect(inferCourseDirection('Symptomatik gebessert unter Therapie')).toBe('improved')
    expect(inferCourseDirection('Zunehmende Unruhe und Agitation')).toBe('worsened')
    expect(inferCourseDirection('Weiterhin stabil und kooperativ')).toBe('stable')
  })
})

describe('savePsychopathFindingEdit', () => {
  beforeEach(() => {
    mockLoadState.mockReset()
    mockSaveState.mockReset()
    mockUpsert.mockReset()
    mockLoadState.mockReturnValue({
      version: 1,
      updatedAt: '2026-06-01T00:00:00.000Z',
      current: {
        id: 'prev-1',
        date: '2026-06-01T00:00:00.000Z',
        text: 'Vorheriger Befund.',
        source: 'import',
        courseDirection: 'stable',
        savedAt: '2026-06-01T00:00:00.000Z',
      },
      history: [],
    })
  })

  it('archives the previous current entry and upserts a psychopathology imprint', () => {
    const result = savePsychopathFindingEdit({
      caseId: 'case-1',
      text: 'Affektiv gebessert, antriebssteigernd.',
      courseDirection: 'improved',
    })

    expect(result.current?.text).toBe('Affektiv gebessert, antriebssteigernd.')
    expect(result.history).toHaveLength(1)
    expect(result.history[0]?.text).toBe('Vorheriger Befund.')
    expect(mockSaveState).toHaveBeenCalledTimes(1)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        courseDirection: 'improved',
        clinicalDomain: 'psychopathology',
      }),
      'case-1',
    )
  })
})

describe('buildSymptomSnapshotData', () => {
  const realisticText =
    'Der Patient präsentierte sich in leicht ungepflegtem Erscheinungsbild, distanziert im Kontakt. ' +
    'Formales Denken gedämpft, Antrieb reduziert. Keine Suizidalität. Krankheitseinsicht vermindert.'

  beforeEach(() => {
    mockLoadState.mockReset()
    mockLoadImprints.mockReset()
    mockLoadState.mockReturnValue({
      version: 1,
      updatedAt: '2026-06-19T00:00:00.000Z',
      current: {
        id: 'cur-1',
        date: '2026-06-19T00:00:00.000Z',
        text: realisticText,
        source: 'overview',
        courseDirection: 'stable',
        savedAt: '2026-06-19T00:00:00.000Z',
      },
      history: [],
      aiStructured: {
        version: 1,
        sourceTextHash: 'stale',
        extractedAt: '2026-06-19T00:00:00.000Z',
        status: 'accepted',
        fields: {},
        domains: [
          { domainKey: 'thoughtForm', status: 'positive', detail: 'gedämpft' },
          { domainKey: 'drive', status: 'positive', detail: 'reduziert' },
          { domainKey: 'suicidality', status: 'positive', detail: 'Suizidale' },
          { domainKey: 'socialInteraction', status: 'positive', detail: 'distanziert' },
        ],
        courseDirection: 'stable',
        confidence: 'medium',
      },
    })
    mockLoadImprints.mockReturnValue({
      version: 1,
      updatedAt: '2026-06-19T00:00:00.000Z',
      imprints: [
        {
          imprintKey: 'test:1',
          patientId: 'p1',
          caseId: 'case-ppb',
          sourceType: 'manual_note',
          sourceId: '1',
          sourceDate: '2026-06-19',
          createdAt: '2026-06-19T00:00:00.000Z',
          readableClinicalSentence: realisticText,
          clinicalDomain: 'psychopathology',
          symptoms: [],
          severity: null,
          courseDirection: 'stable',
          affect: null,
          drive: 'reduziert',
          thoughtForm: 'gedämpft',
          thoughtContent: null,
          perception: null,
          selfDisturbance: null,
          cognition: null,
          sleep: null,
          cooperation: null,
          insight: 'vermindert',
          riskSelf: null,
          riskOthers: null,
          aggression: null,
          suicidality: 'Suizidale',
          functioning: null,
          socialInteraction: 'distanziert',
          hygieneSelfCare: 'leicht ungepflegt',
          medicationMentioned: [],
          medicationResponse: null,
          sideEffects: null,
          adherence: null,
          diagnosisHints: [],
          differentialDiagnosisHints: [],
          uncertainty: null,
          evidenceStrength: 'direct_observation',
          evidenceText: null,
          evidenceQuoteRange: null,
          analysisEligible: true,
          excludeReason: null,
        },
      ],
    })
  })

  it('omits diagnosis context from meta data and re-sanitizes stale AI domains', () => {
    const data = buildSymptomSnapshotData('case-ppb', 'de')
    expect(data.contextLabel).toBeNull()
    expect(data.structured.some((cue) => cue.domainKey === 'suicidality')).toBe(false)
    expect(data.structured.some((cue) => cue.value === 'Suizidale')).toBe(false)
    expect(data.structured.map((cue) => cue.domainKey)).toEqual(
      expect.arrayContaining(['thoughtForm', 'drive', 'socialInteraction']),
    )
    for (const cue of data.structured) {
      expect(cue.value).not.toMatch(/^(positiv|negativ|unklar|positive|negative)$/i)
    }
    expect(data.collapseNarrative).toBe(true)
    expect(data.unremarkableSummary).toBeTruthy()
  })
})

describe('seedPsychopathFindingFromImport', () => {
  beforeEach(() => {
    mockLoadState.mockReset()
    mockSaveState.mockReset()
    mockUpsert.mockReset()
    mockLoadState.mockReturnValue({
      version: 1,
      updatedAt: '2026-06-01T00:00:00.000Z',
      current: null,
      history: [],
    })
  })

  it('creates an import-sourced current finding', () => {
    const result = seedPsychopathFindingFromImport(
      'case-2',
      'Wach, allseits orientiert, niedergestimmt.',
      '2026-06-04T08:00:00.000Z',
    )

    expect(result.current?.source).toBe('import')
    expect(result.current?.text).toContain('niedergestimmt')
    expect(mockUpsert).toHaveBeenCalled()
  })
})

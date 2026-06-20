import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ClinicalIntelligenceRunResponse } from '../../../types/clinicalIntelligence'
import {
  CI_DOCUMENT_PAGE_TYPE,
  formatCiAcceptedDocumentContent,
  formatCiAcceptedDocumentTitle,
  type CiAcceptedDocumentLabels,
} from '../formatAcceptedDocument'
import { loadDokumente } from '../../dokumenteArchive'
import { saveCiAcceptedToDokumente } from '../saveAcceptedToDokumente'

const LABELS: CiAcceptedDocumentLabels = {
  titlePrefix: 'Klinische Intelligenz — Befund',
  headerCase: 'Fall',
  headerRunDate: 'Letzte Analyse',
  headerSavedDate: 'Zuletzt gespeichert',
  clinicianComment: 'Klinischer Kommentar',
  sectionDimensions: 'Dimensionales Profil',
  sectionMechanisms: 'Mechanismushypothesen',
  severity: 'Schweregrad',
  confidence: 'Konfidenz',
  clinicalSummary: 'Klinische Zusammenfassung',
  longitudinalPattern: 'Längsschnittmuster',
  uncertainty: 'Unsicherheit',
  missingData: 'Fehlende Daten',
  clinicalImplication: 'Klinische Implikation',
  treatmentRelevance: 'Therapierelevanz',
  statusAccepted: 'Akzeptiert',
  statusEdited: 'Bearbeitet',
  disclaimer: 'KI-generierte Hypothese — klinisch geprüft.',
  noAcceptedDimensions: 'Keine akzeptierten dimensionalen Befunde.',
  noAcceptedMechanisms: 'Keine akzeptierten Mechanismushypothesen.',
  confidenceLow: 'niedrig',
  confidenceModerate: 'moderat',
  confidenceHigh: 'hoch',
}

function makeRun(): ClinicalIntelligenceRunResponse {
  return {
    builtAt: '2026-06-20T10:00:00.000Z',
    language: 'de',
    dimensional: {
      activeDimensions: [
        {
          dimensionId: 'anxiety-threat-anticipation',
          dimensionName: 'Angst / Bedrohungsantizipation',
          severity: 3,
          confidence: 'moderate',
          longitudinalPattern: 'Zunahme in den letzten Wochen',
          supportingEvidenceIds: [],
          contradictingEvidenceIds: [],
          clinicalSummary: 'Ausgeprägte Antizipationsangst mit Vermeidung.',
          uncertainty: '',
          missingData: '',
          reviewStatus: 'accepted',
          source: 'evidence_based',
        },
      ],
      exploratoryInsufficientEvidence: [],
      quarantined: [],
    },
    mechanism: {
      activeMechanisms: [
        {
          mechanismId: 'trauma-limbic-hyperreactivity',
          label: 'Trauma-assoziierte limbische Hyperreaktivität',
          confidence: 'high',
          linkedDimensions: ['anxiety-threat-anticipation'],
          supportingEvidenceIds: [],
          contradictingEvidenceIds: [],
          clinicalImplication: 'Emotionale Trigger führen zu Überflutung.',
          treatmentRelevance: 'Traumafokussierte Psychotherapie erwägen.',
          uncertainty: '',
          reviewStatus: 'edited',
          source: 'evidence_based',
        },
      ],
      exploratoryInsufficientEvidence: [],
      quarantined: [],
    },
    evidenceItemCount: 2,
    diagnostics: { dimensional: null, mechanism: null },
  }
}

describe('formatCiAcceptedDocumentContent', () => {
  it('renders human-readable clinical text with accepted findings', () => {
    const content = formatCiAcceptedDocumentContent({
      caseId: 'case-ci-1',
      run: makeRun(),
      clinicianComment: 'Patientin stimmt Psychoedukation zu.',
      savedAt: '2026-06-20T14:30:00.000Z',
      labels: LABELS,
      locale: 'de',
    })

    expect(content).toContain('Fall: case-ci-1')
    expect(content).toContain('Angst / Bedrohungsantizipation (Akzeptiert)')
    expect(content).toContain('Schweregrad: 3/4')
    expect(content).toContain('Trauma-assoziierte limbische Hyperreaktivität (Bearbeitet)')
    expect(content).toContain('Patientin stimmt Psychoedukation zu.')
    expect(content).toContain(LABELS.disclaimer)
    expect(content.trim().startsWith('{')).toBe(false)
  })

  it('builds a dated document title', () => {
    const title = formatCiAcceptedDocumentTitle(
      '2026-06-20T14:30:00.000Z',
      'de',
      LABELS.titlePrefix,
    )
    expect(title).toMatch(/^Klinische Intelligenz — Befund — /)
  })
})

describe('saveCiAcceptedToDokumente', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('creates a formulare document entry in the archive', () => {
    const entry = saveCiAcceptedToDokumente({
      caseId: 'case-ci-save',
      run: makeRun(),
      clinicianComment: '',
      savedAt: '2026-06-20T14:30:00.000Z',
      labels: LABELS,
      locale: 'de',
    })

    expect(entry.pageType).toBe(CI_DOCUMENT_PAGE_TYPE)
    expect(entry.category).toBe('formulare')
    expect(entry.source).toBe('ai-accepted')
    expect(entry.content).toContain('Angst / Bedrohungsantizipation')

    const docs = loadDokumente('case-ci-save')
    expect(docs).toHaveLength(1)
    expect(docs[0]?.id).toBe(entry.id)
  })

  it('does not trigger a browser JSON download', () => {
    const createElementSpy = vi.spyOn(document, 'createElement')

    saveCiAcceptedToDokumente({
      caseId: 'case-ci-save',
      run: makeRun(),
      clinicianComment: '',
      savedAt: '2026-06-20T14:30:00.000Z',
      labels: LABELS,
      locale: 'de',
    })

    const anchorCalls = createElementSpy.mock.calls.filter(([tag]) => tag === 'a')
    expect(anchorCalls).toHaveLength(0)
  })
})

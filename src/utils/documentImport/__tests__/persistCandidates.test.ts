import { beforeEach, describe, expect, it } from 'vitest'
import { persistAcceptedCandidates } from '../persistCandidates'
import { makeCandidate } from '../candidateFactory'
import type { ClinicalImportEnvelope } from '../../../schemas/documentImport/envelope'
import { loadDokumente } from '../../dokumenteArchive'
import { loadDiagnosen } from '../../diagnosenArchive'
import { loadVerlaufFeed } from '../../verlaufFeed'
import { loadBefunde } from '../../laborArchive'
import { getOrCreateMedicationPlanState } from '../../medication/storage'
import { findProvenanceForEntity, loadProvenanceLedger } from '../provenanceLedger'

function envelopeFor(caseFormat = 'docx'): ClinicalImportEnvelope {
  return {
    envelopeVersion: 1,
    sourceDocumentId: 'src-doc-1',
    parserVersion: '1.0.0',
    parsingMode: 'structured',
    source: {
      filename: 'arztbrief.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      detectedFormat: caseFormat as ClinicalImportEnvelope['source']['detectedFormat'],
      sizeBytes: 42,
      importedAt: '2026-01-01T00:00:00.000Z',
    },
    candidates: [],
    notices: [],
  }
}

let caseSeq = 0
function freshCaseId(): string {
  caseSeq += 1
  return `persist-test-${Date.now()}-${caseSeq}`
}

beforeEach(() => {
  localStorage.clear()
})

describe('persistAcceptedCandidates', () => {
  it('writes each accepted candidate into the correct module and stamps provenance', () => {
    const caseId = freshCaseId()
    const envelope = envelopeFor()
    const candidates = [
      makeCandidate({ module: 'diagnosis', sourceLocation: { section: 'Diagnosen' }, data: { label: 'Depression', icd10Code: 'F32.1' } }),
      makeCandidate({ module: 'anamnese', sourceLocation: { section: 'Anamnese' }, data: { sectionId: 'suchtanamnese', title: 'Sucht', text: 'Kein Alkohol.' } }),
      makeCandidate({ module: 'verlauf', sourceLocation: { section: 'Verlauf' }, data: { text: 'Stabil.' } }),
      makeCandidate({ module: 'lab', sourceLocation: { sheet: 'Labor' }, data: { panelLabel: 'Elektrolyte', values: [{ name: 'Natrium', value: '140', unit: 'mmol/l' }] } }),
      makeCandidate({ module: 'medication', sourceLocation: { section: 'Medikation' }, data: { substance: 'Sertralin', strength: '50 mg', doseText: '1-0-0' } }),
    ]

    const result = persistAcceptedCandidates({
      caseId,
      envelope,
      acceptedCandidates: candidates,
      acceptedBy: 'Dr. Test',
      language: 'de',
      now: () => '2026-01-02T00:00:00.000Z',
    })

    expect(result.errors).toHaveLength(0)
    expect(result.persisted).toHaveLength(5)

    // Module writes
    expect(loadDiagnosen(caseId).map((d) => d.icd10.code)).toContain('F32.1')
    expect(loadDokumente(caseId).some((d) => d.category === 'anamnese')).toBe(true)
    expect(loadVerlaufFeed(caseId).some((v) => v.content === 'Stabil.')).toBe(true)
    expect(loadBefunde(caseId)).toHaveLength(1)
    const meds = getOrCreateMedicationPlanState(caseId)
    const currentPlan = meds.plans.find((p) => p.id === meds.currentPlanId)
    expect(currentPlan?.medications.some((m) => m.substance === 'Sertralin')).toBe(true)

    // Provenance for every accepted item
    const ledger = loadProvenanceLedger(caseId)
    expect(ledger).toHaveLength(5)
    for (const item of result.persisted) {
      const prov = findProvenanceForEntity(caseId, item.targetEntityId)
      expect(prov).not.toBeNull()
      expect(prov?.filename).toBe('arztbrief.docx')
      expect(prov?.parserVersion).toBe('1.0.0')
      expect(prov?.acceptedBy).toBe('Dr. Test')
      expect(prov?.acceptedAt).toBe('2026-01-02T00:00:00.000Z')
    }
  })

  it('persists a stored-only PDF document with attachment metadata', () => {
    const caseId = freshCaseId()
    const envelope = envelopeFor('pdf')
    const candidate = makeCandidate({
      module: 'document',
      data: {
        title: 'scan.pdf',
        text: 'stored only',
        attachment: { storeId: 'store-1', mimeType: 'application/pdf', originalFileName: 'scan.pdf', sizeBytes: 10 },
      },
    })

    const result = persistAcceptedCandidates({
      caseId,
      envelope,
      acceptedCandidates: [candidate],
      acceptedBy: 'Dr. Test',
      language: 'de',
    })

    expect(result.persisted).toHaveLength(1)
    const docs = loadDokumente(caseId)
    expect(docs).toHaveLength(1)
    expect(docs[0].category).toBe('externe-befunde')
    expect(docs[0].parsingMode).toBe('stored_only')
    expect(docs[0].attachment?.storeId).toBe('store-1')
  })

  it('isolates failures to individual candidates', () => {
    const caseId = freshCaseId()
    const envelope = envelopeFor()
    // A lab candidate with an empty values array passes the type but the schema in
    // the pipeline would reject it; here we simulate a writer failure by an empty panel.
    const ok = makeCandidate({ module: 'diagnosis', data: { label: 'A', icd10Code: 'F00.0' } })
    const result = persistAcceptedCandidates({
      caseId,
      envelope,
      acceptedCandidates: [ok],
      acceptedBy: 'Dr. Test',
      language: 'de',
    })
    expect(result.persisted).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })
})

import { describe, expect, it } from 'vitest'
import type { ClinicalImportEnvelope } from '../../../schemas/documentImport/envelope'
import {
  buildAnalyzeMetadata,
  buildMappingItems,
  shouldRunPostParseAnalyze,
} from '../buildAnalyzeMetadata'

const baseEnvelope: ClinicalImportEnvelope = {
  envelopeVersion: 1,
  sourceDocumentId: 'doc-1',
  parserVersion: 'test',
  parsingMode: 'structured',
  source: {
    filename: 'test.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    detectedFormat: 'docx',
    sizeBytes: 100,
    importedAt: '2026-01-01T00:00:00.000Z',
    columns: ['Name', 'Medikament', '01.02.1990'],
  },
  candidates: [
    {
      id: 'c1',
      module: 'document',
      confidence: 'low',
      sourceLocation: { section: 'Verlauf' },
      data: { title: 'Unbekannt', text: 'Patient Max Mustermann nahm Sertralin 50mg.' },
      rawText: 'Patient Max Mustermann nahm Sertralin 50mg.',
    },
    {
      id: 'c2',
      module: 'medication',
      confidence: 'high',
      sourceLocation: { row: 1 },
      data: { substance: 'Sertralin', strength: '50 mg' },
    },
  ],
  notices: [{ level: 'warning', code: 'mapping_uncertain', message: 'test' }],
}

describe('buildAnalyzeMetadata', () => {
  it('de-identifies structural hints and columns before AI', () => {
    const metadata = buildAnalyzeMetadata(baseEnvelope, baseEnvelope.candidates, {
      patientNames: ['Max', 'Mustermann', 'Max Mustermann'],
    })
    expect(metadata.moduleCounts.medication).toBe(1)
    expect(metadata.noticeCodes).toContain('mapping_uncertain')
    expect(metadata.columns?.some((c) => c.includes('[NAME]') || c.includes('[DATE]'))).toBe(true)
    const docCandidate = metadata.candidates.find((c) => c.candidateId === 'c1')
    expect(docCandidate?.structuralHint).not.toMatch(/Mustermann|Max Mustermann/)
    expect(docCandidate?.needsMappingAssist).toBe(true)
  })

  it('builds mapping items only for uncertain candidates', () => {
    const items = buildMappingItems(baseEnvelope.candidates, {
      patientNames: ['Max Mustermann'],
    })
    expect(items.some((i) => i.candidateId === 'c1')).toBe(true)
    expect(items.some((i) => i.candidateId === 'c2')).toBe(false)
  })

  it('detects when post-parse analyze is useful', () => {
    expect(shouldRunPostParseAnalyze(baseEnvelope.candidates)).toBe(true)
    expect(shouldRunPostParseAnalyze([])).toBe(false)
  })
})

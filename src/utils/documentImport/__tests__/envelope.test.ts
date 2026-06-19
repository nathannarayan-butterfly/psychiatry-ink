import { describe, expect, it } from 'vitest'
import { parseFile } from '../parsers/index'
import {
  ClinicalImportEnvelopeSchema,
  safeParseClinicalImportEnvelope,
} from '../../../schemas/documentImport/envelope'
import { DOCUMENT_IMPORT_PARSER_VERSION } from '../parserVersion'

function jsonFile(obj: unknown, name = 'data.json'): File {
  return new File([JSON.stringify(obj)], name, { type: 'application/json' })
}

describe('ClinicalImportEnvelope schema', () => {
  it('rejects an envelope with a bad candidate module', () => {
    const result = safeParseClinicalImportEnvelope({
      envelopeVersion: 1,
      sourceDocumentId: 'x',
      parserVersion: '1.0.0',
      parsingMode: 'structured',
      source: { filename: 'f', mimeType: '', detectedFormat: 'json', sizeBytes: 0, importedAt: 'now' },
      candidates: [{ id: 'c1', module: 'nonsense', confidence: 'high', sourceLocation: {}, data: {} }],
      notices: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('parseFile (dispatch + envelope)', () => {
  it('produces a valid, schema-conformant envelope for JSON', async () => {
    const file = jsonFile({ diagnoses: [{ icd10: 'F32.1', label: 'Depression' }] })
    const { envelope } = await parseFile(file, { caseId: 'case-1' })
    expect(() => ClinicalImportEnvelopeSchema.parse(envelope)).not.toThrow()
    expect(envelope.parserVersion).toBe(DOCUMENT_IMPORT_PARSER_VERSION)
    expect(envelope.parsingMode).toBe('structured')
    expect(envelope.source.detectedFormat).toBe('json')
    expect(envelope.candidates).toHaveLength(1)
    expect(envelope.sourceDocumentId).toBeTruthy()
  })

  it('returns a tabular context for CSV uploads', async () => {
    const file = new File(['ICD10,Diagnose\nF20.0,Schizophrenie'], 'dx.csv', { type: 'text/csv' })
    const { envelope, tabular } = await parseFile(file, { caseId: 'case-1' })
    expect(envelope.source.detectedFormat).toBe('csv')
    expect(tabular).toBeDefined()
    expect(tabular?.mapping.module).toBe('diagnosis')
    expect(tabular?.table.headers).toEqual(['ICD10', 'Diagnose'])
  })

  it('routes DOCX through the injected extractor', async () => {
    const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'letter.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    const { envelope } = await parseFile(file, {
      caseId: 'case-1',
      docxExtractor: async () => 'Medikation\nSertralin 50 mg 1-0-0',
    })
    expect(envelope.source.detectedFormat).toBe('docx')
    expect(envelope.candidates[0].module).toBe('medication')
  })

  it('stores PDFs only and never extracts clinical fields', async () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'scan.pdf', { type: 'application/pdf' })
    let stored: File | null = null
    const { envelope } = await parseFile(file, {
      caseId: 'case-1',
      storeAttachment: async (f) => {
        stored = f
        return 'store-xyz'
      },
    })
    expect(stored).toBe(file)
    expect(envelope.parsingMode).toBe('stored_only')
    expect(envelope.candidates).toHaveLength(1)
    expect(envelope.candidates[0].module).toBe('document')
  })

  it('flags unsupported formats with an error notice', async () => {
    const file = new File(['\u0000\u0001\u0002'], 'mystery.bin', { type: 'application/octet-stream' })
    const { envelope } = await parseFile(file, { caseId: 'case-1' })
    expect(envelope.candidates).toHaveLength(0)
    expect(envelope.notices.some((n) => n.code === 'unsupported_format')).toBe(true)
  })
})

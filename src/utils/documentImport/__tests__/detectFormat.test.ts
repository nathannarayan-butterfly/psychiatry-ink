import { describe, expect, it } from 'vitest'
import { detectImportFormat, fileExtension, isTextFormat } from '../detectFormat'

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
const ZIP_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00])

describe('fileExtension', () => {
  it('extracts the lowercased extension', () => {
    expect(fileExtension('Report.PDF')).toBe('pdf')
    expect(fileExtension('a.b.csv')).toBe('csv')
    expect(fileExtension('noext')).toBe('')
  })
})

describe('detectImportFormat', () => {
  it('detects PDF from magic bytes regardless of extension', () => {
    expect(detectImportFormat({ filename: 'scan.bin', sampleBytes: PDF_BYTES }).format).toBe('pdf')
  })

  it('disambiguates docx vs xlsx zips by extension', () => {
    expect(detectImportFormat({ filename: 'letter.docx', sampleBytes: ZIP_BYTES }).format).toBe('docx')
    expect(detectImportFormat({ filename: 'labs.xlsx', sampleBytes: ZIP_BYTES }).format).toBe('xlsx')
  })

  it('uses extension before content', () => {
    expect(detectImportFormat({ filename: 'data.json', sampleText: '{}' }).format).toBe('json')
    expect(detectImportFormat({ filename: 'data.jsonl' }).format).toBe('jsonl')
  })

  it('uses MIME when extension is unknown', () => {
    expect(detectImportFormat({ filename: 'blob', mimeType: 'application/pdf' }).format).toBe('pdf')
    expect(detectImportFormat({ filename: 'blob', mimeType: 'text/csv' }).format).toBe('csv')
  })

  it('sniffs JSON content', () => {
    const res = detectImportFormat({ filename: 'unknown', sampleText: '{"diagnoses":[]}' })
    expect(res.format).toBe('json')
    expect(res.via).toBe('content')
  })

  it('sniffs JSONL content (multiple object lines)', () => {
    const res = detectImportFormat({ filename: 'unknown', sampleText: '{"a":1}\n{"a":2}\n{"a":3}' })
    expect(res.format).toBe('jsonl')
  })

  it('sniffs CSV content via consistent delimiters', () => {
    const res = detectImportFormat({ filename: 'unknown', sampleText: 'a,b,c\n1,2,3\n4,5,6' })
    expect(res.format).toBe('csv')
  })

  it('falls back to txt for ambiguous prose', () => {
    expect(detectImportFormat({ filename: 'note', sampleText: 'Patient war ruhig und kooperativ.' }).format).toBe('txt')
  })

  it('returns null when nothing matches', () => {
    expect(detectImportFormat({ filename: 'mystery' }).format).toBeNull()
  })

  it('classifies pdf as non-text', () => {
    expect(isTextFormat('pdf')).toBe(false)
    expect(isTextFormat('csv')).toBe(true)
  })
})

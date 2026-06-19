import { describe, expect, it, vi } from 'vitest'
import { parsePdfStoredOnly, PDF_STORED_ONLY_MESSAGE_DE } from '../parsers/pdfStoredOnlyParser'

function pdfFile(): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'scan.pdf', { type: 'application/pdf' })
}

describe('parsePdfStoredOnly', () => {
  it('stores the file and produces a single stored-only document candidate', async () => {
    const store = vi.fn(async () => 'store-123')
    const file = pdfFile()
    const result = await parsePdfStoredOnly(file, store)

    expect(store).toHaveBeenCalledWith(file)
    expect(result.parsingMode).toBe('stored_only')
    expect(result.candidates).toHaveLength(1)
    const candidate = result.candidates[0]
    expect(candidate.module).toBe('document')
    if (candidate.module === 'document') {
      expect(candidate.data.attachment).toMatchObject({
        storeId: 'store-123',
        mimeType: 'application/pdf',
        originalFileName: 'scan.pdf',
      })
      expect(candidate.data.text).toBe(PDF_STORED_ONLY_MESSAGE_DE)
    }
    expect(result.notices[0].code).toBe('pdf_stored_only')
  })

  it('reports a store failure as an error notice', async () => {
    const result = await parsePdfStoredOnly(pdfFile(), async () => {
      throw new Error('idb down')
    })
    expect(result.candidates).toHaveLength(0)
    expect(result.notices[0].code).toBe('pdf_store_failed')
  })
})

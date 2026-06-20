import { describe, it, expect } from 'vitest'
import {
  CompactEvidenceFilterError,
  assertCompactEvidenceOnly,
  safeAssertCompactEvidence,
} from '../evidenceFilter'

function makeCompact(overrides: Partial<{
  items: Array<{ id: string; category: string; label: string; text: string }>
  isDeidentified: boolean
  caseId: string
}> = {}) {
  return {
    caseId: overrides.caseId ?? 'case-123',
    builtAt: '2026-06-20T10:00:00.000Z',
    isDeidentified: overrides.isDeidentified ?? true,
    patientLabel: 'Patient X',
    items:
      overrides.items ??
      [
        {
          id: 'anam-1',
          category: 'anamnesis',
          label: 'Anamnese',
          text: 'Patient reports persistent depressed mood for 6 weeks with anhedonia and insomnia.',
        },
      ],
  }
}

describe('assertCompactEvidenceOnly', () => {
  it('accepts a well-formed de-identified payload', () => {
    const compact = makeCompact()
    expect(() => assertCompactEvidenceOnly(compact)).not.toThrow()
  })

  it('rejects null / non-object inputs', () => {
    expect(() => assertCompactEvidenceOnly(null)).toThrow(CompactEvidenceFilterError)
    expect(() => assertCompactEvidenceOnly(undefined)).toThrow(CompactEvidenceFilterError)
    expect(() => assertCompactEvidenceOnly('string')).toThrow(CompactEvidenceFilterError)
    expect(() => assertCompactEvidenceOnly(['x'])).toThrow(CompactEvidenceFilterError)
  })

  it('rejects raw document shapes via forbidden top-level fields', () => {
    const rawDocLike = {
      ...makeCompact(),
      documents: [{ id: 'd1' }],
    }
    try {
      assertCompactEvidenceOnly(rawDocLike)
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(CompactEvidenceFilterError)
      expect((err as CompactEvidenceFilterError).code).toBe('raw_document_shape')
    }
  })

  it('rejects sectionContents / editorContent / patientMetadata shapes', () => {
    for (const field of [
      'sectionContents',
      'editorContent',
      'patientMetadata',
      'identifiedPackageContent',
      'medicationPlanState',
      'documentTypeId',
    ]) {
      const withField = { ...makeCompact(), [field]: 'leaked' }
      const result = safeAssertCompactEvidence(withField)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('raw_document_shape')
    }
  })

  it('rejects payload with isDeidentified !== true', () => {
    // The schema requires isDeidentified literal true, so this fails schema-validation
    // first — surfaced as invalid_shape (defense-in-depth: never trust input).
    const result = safeAssertCompactEvidence({ ...makeCompact(), isDeidentified: false })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(['invalid_shape', 'not_deidentified']).toContain(result.error.code)
    }
  })

  it('rejects empty / too-thin payloads', () => {
    const result = safeAssertCompactEvidence(
      makeCompact({ items: [{ id: 'x', category: 'a', label: 'L', text: 'no' }] }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('empty')
  })

  it('rejects payloads that exceed the total byte budget', () => {
    const big = 'X'.repeat(13_000)
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: `item-${i}`,
      category: 'note',
      label: `Item ${i}`,
      text: big,
    }))
    const result = safeAssertCompactEvidence(makeCompact({ items }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('over_budget')
  })

  it('safeAssertCompactEvidence wraps unknown errors as invalid_shape', () => {
    const result = safeAssertCompactEvidence(123 as unknown)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(CompactEvidenceFilterError)
  })
})

import { describe, expect, it } from 'vitest'
import {
  applyKbTranslations,
  collectKbTranslations,
  countMissingEnglish,
  translateKbItem,
  type TranslateBatchFn,
} from './kbEnglishTranslation'

/** A compact KnowledgeBaseDrug-shaped fixture mirroring the live JSONB shape. */
function makeDrug(): Record<string, unknown> {
  return {
    id: 'seed-risperidone-002',
    genericName: 'Risperidon',
    brandNames: ['Risperdal®'],
    drugClass: 'Atypisches Antipsychotikum (SGA)',
    category: 'Antipsychotika',
    tags: ['SGA', 'D2'],
    verificationStatus: 'verified',
    sections: [
      {
        key: 'kurzprofil',
        label: 'Kurzprofil',
        content: 'Atypisches Antipsychotikum mit starker D2- und 5-HT2A-Affinität.',
      },
      {
        key: 'nebenwirkungen',
        label: 'Nebenwirkungen',
        content: '',
        sideEffects: [
          { effect: 'Hyperprolaktinämie', system: 'endokrin', frequency: 'veryCommon', severity: 'moderate' },
        ],
      },
    ],
    receptorAffinityProfile: [
      { target: 'D2', affinityPercent: 70, action: 'antagonist', sourceNote: 'PDSP-Datenbank' },
    ],
  }
}

/** Mock backend: returns deterministic English for known German strings. */
const mockTranslate: TranslateBatchFn = async (inputs) => {
  const dict: Record<string, string> = {
    Risperidon: 'Risperidone',
    'Atypisches Antipsychotikum (SGA)': 'Atypical antipsychotic (SGA)',
    Antipsychotika: 'Antipsychotics',
    SGA: 'SGA',
    D2: 'D2',
    Kurzprofil: 'Overview',
    'Atypisches Antipsychotikum mit starker D2- und 5-HT2A-Affinität.':
      'Atypical antipsychotic with high D2 and 5-HT2A affinity.',
    Nebenwirkungen: 'Side effects',
    'Hyperprolaktinämie': 'Hyperprolactinaemia',
    endokrin: 'endocrine',
    'PDSP-Datenbank': 'PDSP database',
  }
  const out: Record<string, string> = {}
  for (const [id, text] of Object.entries(inputs)) {
    if (dict[text] != null) out[id] = dict[text]
  }
  return out
}

describe('collectKbTranslations', () => {
  it('collects nested translatable German strings and array items', () => {
    const drug = makeDrug()
    const pending = collectKbTranslations(drug)
    const texts = pending.map((p) => p.text)
    expect(texts).toContain('Risperidon')
    expect(texts).toContain('Atypisches Antipsychotikum mit starker D2- und 5-HT2A-Affinität.')
    expect(texts).toContain('Hyperprolaktinämie')
    expect(texts).toContain('PDSP-Datenbank')
    // tags expand to per-element units
    expect(texts).toContain('SGA')
    expect(texts).toContain('D2')
  })

  it('never collects brand names', () => {
    const pending = collectKbTranslations(makeDrug())
    expect(pending.map((p) => p.text)).not.toContain('Risperdal®')
  })

  it('skips empty German source strings', () => {
    const pending = collectKbTranslations(makeDrug())
    // The empty `content` on the side-effects section must not be requested.
    expect(pending.some((p) => p.text === '')).toBe(false)
  })
})

describe('translateKbItem', () => {
  it('fills *En fields, sets machine provenance, and preserves source data', async () => {
    const drug = makeDrug()
    const res = await translateKbItem(drug, mockTranslate, { timestamp: '2026-06-21T00:00:00.000Z' })

    expect(res.skipped).toBe(false)
    expect(res.applied).toBeGreaterThan(0)

    // English siblings populated
    expect(drug.genericNameEn).toBe('Risperidone')
    expect(drug.drugClassEn).toBe('Atypical antipsychotic (SGA)')
    expect(drug.categoryEn).toBe('Antipsychotics')
    expect(drug.tagsEn).toEqual(['SGA', 'D2'])

    const sections = drug.sections as Array<Record<string, unknown>>
    expect(sections[0].contentEn).toBe('Atypical antipsychotic with high D2 and 5-HT2A affinity.')
    const sideEffects = sections[1].sideEffects as Array<Record<string, unknown>>
    expect(sideEffects[0].effectEn).toBe('Hyperprolactinaemia')
    expect(sideEffects[0].systemEn).toBe('endocrine')
    const receptors = drug.receptorAffinityProfile as Array<Record<string, unknown>>
    expect(receptors[0].sourceNoteEn).toBe('PDSP database')

    // provenance marker set
    expect(drug.enContentSource).toBe('machine')
    expect(drug.enTranslatedAt).toBe('2026-06-21T00:00:00.000Z')

    // INN / brand source NOT mutated; verification status preserved
    expect(drug.genericName).toBe('Risperidon')
    expect(drug.brandNames).toEqual(['Risperdal®'])
    expect(drug.verificationStatus).toBe('verified')
  })

  it('is idempotent: a second run translates nothing', async () => {
    const drug = makeDrug()
    await translateKbItem(drug, mockTranslate)
    expect(countMissingEnglish(drug)).toBe(0)
    const second = await translateKbItem(drug, mockTranslate)
    expect(second.skipped).toBe(true)
    expect(second.applied).toBe(0)
  })

  it('does not set provenance when nothing is applied', async () => {
    const empty: Record<string, unknown> = { id: 'x', brandNames: ['OnlyBrand'] }
    const res = await translateKbItem(empty, mockTranslate)
    expect(res.skipped).toBe(true)
    expect(empty.enContentSource).toBeUndefined()
  })
})

describe('applyKbTranslations', () => {
  it('falls back to German for array elements the LLM omitted', () => {
    const drug = { tags: ['SGA', 'Depot'] } as Record<string, unknown>
    applyKbTranslations(drug, { tags: 'SGA', 'tags.0': 'SGA' })
    // index 1 omitted -> German fallback so tagsEn is never partially empty
    expect(drug.tagsEn).toEqual(['SGA', 'Depot'])
  })
})

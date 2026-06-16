import { describe, expect, it } from 'vitest'
import {
  buildLabRelevance,
  classifyAnalyte,
  matchAnalyteKey,
  isSpiegelAnalyte,
} from '../labRelevance'

describe('matchAnalyteKey', () => {
  it('maps the German lab parameter names the app actually parses', () => {
    expect(matchAnalyteKey('Leukozyten')).toBe('leukocytes')
    expect(matchAnalyteKey('Neutrophile (ANC)')).toBe('neutrophils')
    expect(matchAnalyteKey('GOT (AST)')).toBe('liverEnzymes')
    expect(matchAnalyteKey('GPT (ALT)')).toBe('liverEnzymes')
    expect(matchAnalyteKey('Kreatinin')).toBe('creatinine')
    expect(matchAnalyteKey('eGFR (CKD-EPI)')).toBe('egfr')
    expect(matchAnalyteKey('Natrium')).toBe('sodium')
    expect(matchAnalyteKey('HbA1c')).toBe('hba1c')
    expect(matchAnalyteKey('Prolaktin')).toBe('prolactin')
    expect(matchAnalyteKey('CK gesamt')).toBe('ck')
    expect(matchAnalyteKey('Triglyceride')).toBe('lipids')
  })

  it('does not confuse Kreatinin with CK', () => {
    expect(matchAnalyteKey('Kreatinin')).not.toBe('ck')
  })

  it('returns null for unknown parameters', () => {
    expect(matchAnalyteKey('Irgendwas Unbekanntes')).toBeNull()
  })
})

describe('isSpiegelAnalyte', () => {
  it('detects drug serum levels by name', () => {
    expect(isSpiegelAnalyte('Lithium')).toBe(true)
    expect(isSpiegelAnalyte('Clozapin-Spiegel')).toBe(true)
    expect(isSpiegelAnalyte('Valproat')).toBe(true)
  })

  it('detects by category even for generic value names', () => {
    expect(isSpiegelAnalyte('Talspiegel', 'Medikamentenspiegel')).toBe(true)
  })

  it('is false for routine analytes', () => {
    expect(isSpiegelAnalyte('Leukozyten')).toBe(false)
    expect(isSpiegelAnalyte('Kreatinin')).toBe(false)
  })
})

describe('buildLabRelevance', () => {
  it('yields leukocytes/ANC + myocarditis + metabolic for Clozapine', () => {
    const rel = buildLabRelevance(['Clozapin'])
    expect(rel.rationaleByKey.has('neutrophils')).toBe(true)
    expect(rel.rationaleByKey.has('leukocytes')).toBe(true)
    expect(rel.rationaleByKey.has('crp')).toBe(true)
    expect(rel.rationaleByKey.has('troponin')).toBe(true)
    expect(rel.recognizedDrugs).toContain('Clozapin')
  })

  it('prioritises prolactin for Risperidon', () => {
    const rel = buildLabRelevance(['Risperidon'])
    expect(rel.rationaleByKey.has('prolactin')).toBe(true)
  })

  it('maps Lithium onto renal + thyroid + calcium', () => {
    const rel = buildLabRelevance(['Lithium'])
    expect(rel.rationaleByKey.has('creatinine')).toBe(true)
    expect(rel.rationaleByKey.has('egfr')).toBe(true)
    expect(rel.rationaleByKey.has('tsh')).toBe(true)
    expect(rel.rationaleByKey.has('calcium')).toBe(true)
  })

  it('maps Valproat onto liver enzymes + platelets + ammonia', () => {
    const rel = buildLabRelevance(['Valproat'])
    expect(rel.rationaleByKey.has('liverEnzymes')).toBe(true)
    expect(rel.rationaleByKey.has('platelets')).toBe(true)
    expect(rel.rationaleByKey.has('ammonia')).toBe(true)
  })

  it('maps Carbamazepin onto CBC + sodium + liver', () => {
    const rel = buildLabRelevance(['Carbamazepin'])
    expect(rel.rationaleByKey.has('leukocytes')).toBe(true)
    expect(rel.rationaleByKey.has('sodium')).toBe(true)
    expect(rel.rationaleByKey.has('liverEnzymes')).toBe(true)
  })

  it('tracks unrecognised substances without crashing', () => {
    const rel = buildLabRelevance(['Vitamin C'])
    expect(rel.recognizedDrugs.length + rel.unrecognizedDrugs.length).toBeGreaterThan(0)
  })
})

describe('classifyAnalyte', () => {
  it('always marks Spiegel relevant and first, even with no medication', () => {
    const rel = buildLabRelevance([])
    const c = classifyAnalyte('Lithium', rel)
    expect(c.isSpiegel).toBe(true)
    expect(c.isRelevant).toBe(true)
    expect(c.priority).toBeLessThan(0)
  })

  it('marks Leukozyten relevant under Clozapine with a rationale', () => {
    const rel = buildLabRelevance(['Clozapin'])
    const c = classifyAnalyte('Leukozyten', rel)
    expect(c.isRelevant).toBe(true)
    expect(c.rationale.some((r) => r.drug === 'Clozapin')).toBe(true)
  })

  it('marks an unrelated analyte as not relevant for Clozapine', () => {
    const rel = buildLabRelevance(['Clozapin'])
    const c = classifyAnalyte('Prolaktin', rel)
    expect(c.isRelevant).toBe(false)
  })
})

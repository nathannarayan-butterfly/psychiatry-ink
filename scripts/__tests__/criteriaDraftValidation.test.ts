import { describe, expect, it } from 'vitest'
import {
  parseDisorderDraftJson,
  validateDisorderDraft,
  validateIcd11TreeDraft,
  enrichCatalogueDisorderDraft,
} from '../../src/data/diagnosisCriteria/validateDisorderDraft.ts'

const validDisorder = {
  id: 'test_disorder',
  classification: 'icd10' as const,
  code: 'F99',
  name_de: 'Teststörung',
  crosswalkKey: 'F99',
  sourceRef: 'operationalisiert nach ICD-10 F99 / ICD-11 6E8Z',
  version: 1 as const,
  status: 'draft' as const,
  codingSystems: {
    icd10: { code: 'F99', label_de: 'Teststörung ICD-10' },
    icd11: { code: '6E8Z', label_de: 'Teststörung ICD-11' },
  },
  differentials_de: [
    'Organische Ursache mit psychiatrischen Symptomen',
    'Substanzbedingte Störung',
  ],
  groups: [
    {
      id: 'f99.core',
      label_de: 'Kernkriterien',
      logic: 'at_least_n_of' as const,
      threshold: 2,
      groupType: 'inclusion' as const,
      criteria: [
        {
          id: 'f99.symptom_a',
          text_de:
            'Mindestens zwei Wochen anhaltende psychische Symptome mit klinisch relevantem Leidensdruck oder Funktionsbeeinträchtigung',
          mappingHints: [{ kind: 'isdm_domain' as const, ref: 'general_presentation' }],
          allowClinicianAttest: true,
          citation: [{ classification: 'icd10' as const, code: 'F99', ref: 'A' }],
        },
        {
          id: 'f99.symptom_b',
          text_de:
            'Symptome sind nicht ausschließlich durch eine andere psychiatrische oder somatische Erkrankung erklärbar',
          mappingHints: [{ kind: 'checklist' as const, ref: 'differential_review' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

describe('criteria draft validation', () => {
  it('accepts a well-formed disorder draft', () => {
    const result = validateDisorderDraft(validDisorder)
    expect(result.ok).toBe(true)
    expect(result.draft?.status).toBe('draft')
    expect(result.issues).toEqual([])
  })

  it('rejects one-line stub criteria', () => {
    const bad = {
      ...validDisorder,
      groups: [
        {
          ...validDisorder.groups[0],
          criteria: [
            {
              id: 'f99.stub',
              text_de: 'Symptom vorhanden',
              mappingHints: [{ kind: 'checklist', ref: 'x' }],
              allowClinicianAttest: true,
            },
          ],
        },
      ],
    }
    const result = validateDisorderDraft(bad)
    expect(result.ok).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('rejects non-draft status', () => {
    const result = validateDisorderDraft({ ...validDisorder, status: 'clinician_reviewed' })
    expect(result.ok).toBe(false)
  })

  it('rejects ICD-11 tree ids that collide with ICD-10 ids', () => {
    const withCollision = {
      ...validDisorder,
      icd11: {
        groups: [
          {
            id: 'f99.core',
            label_de: 'ICD-11 Kernkriterien',
            logic: 'all_of',
            groupType: 'inclusion',
            criteria: [
              {
                id: '6e8z.cluster',
                text_de:
                  'ICD-11-spezifisches Symptomcluster mit ausreichend ausgeprägten Merkmalen über die erforderliche Dauer',
                mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
                allowClinicianAttest: true,
              },
            ],
          },
        ],
      },
    }
    const result = validateDisorderDraft(withCollision)
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.message.includes('collides'))).toBe(true)
  })

  it('validates standalone ICD-11 tree drafts', () => {
    const tree = {
      groups: [
        {
          id: '6e8z.core',
          label_de: 'ICD-11 Kernkriterien',
          logic: 'all_of',
          groupType: 'inclusion',
          criteria: [
            {
              id: '6e8z.feature',
              text_de:
                'Klinisch bedeutsames Symptommuster, das den ICD-11 Schwellenanforderungen entspricht und nicht durch andere Ursachen erklärt wird',
              mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content' }],
              allowClinicianAttest: true,
            },
          ],
        },
      ],
    }
    const result = validateIcd11TreeDraft(tree)
    expect(result.ok).toBe(true)
  })

  it('parses fenced JSON from LLM output', () => {
    const parsed = parseDisorderDraftJson(
      '```json\n' + JSON.stringify(validDisorder) + '\n```',
    )
    const result = validateDisorderDraft(parsed)
    expect(result.ok).toBe(true)
  })

  it('enriches catalogue drafts missing top-level metadata', () => {
    const partial = {
      groups: validDisorder.groups,
    }
    const enriched = enrichCatalogueDisorderDraft(partial, {
      icd11Code: '6A41',
      title: 'Katatonie durch Substanzen oder Medikamente',
    })
    const result = validateDisorderDraft(enriched)
    expect(result.ok).toBe(true)
    expect(result.draft?.id).toBe('6a41')
    expect(result.draft?.classification).toBe('icd11')
  })
})

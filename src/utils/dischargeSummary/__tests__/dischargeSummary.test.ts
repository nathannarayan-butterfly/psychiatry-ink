import { describe, expect, it } from 'vitest'
import {
  getDischargeSummarySectionIds,
  getDischargeSummarySections,
} from '../../../data/dischargeSummarySections'
import { buildDischargeSummaryEvidenceBundle } from '../evidenceBundle'
import { createDischargeSummaryDraft, isSectionIncludedInFinal } from '../draftOps'
import { assembleDischargeSummaryText } from '../export'
import { applyRegionSpelling } from '../regionSpelling'

describe('discharge summary section ordering', () => {
  it('short discharge summary has 16 sections in spec order', () => {
    const ids = getDischargeSummarySectionIds('short_discharge_summary')
    expect(ids).toHaveLength(16)
    expect(ids[0]).toBe('header')
    expect(ids[1]).toBe('patient-details')
    expect(ids[7]).toBe('hospital-course')
    expect(ids[14]).toBe('discharge-recommendations')
    expect(ids[15]).toBe('sign-off')
  })

  it('full psychiatric discharge summary has 29 sections', () => {
    const ids = getDischargeSummarySectionIds('full_psychiatric_discharge_summary')
    expect(ids).toHaveLength(29)
    expect(ids[18]).toBe('treatment-hospital-course')
    expect(ids[25]).toBe('recommendations-instructions')
    expect(ids[28]).toBe('sign-off')
  })
})

describe('evidence bundle de-id', () => {
  it('flags isDeidentified and strips dates in manual context', () => {
    const bundle = buildDischargeSummaryEvidenceBundle({
      documentType: 'short_discharge_summary',
      region: 'UK',
      hospitalCourseLength: 'standard',
      manualContext: 'Admission on 12/03/2024 with psychosis.',
    })
    expect(bundle.isDeidentified).toBe(true)
    expect(bundle.summaryText).toContain('[DATE]')
    expect(bundle.summaryText).not.toContain('12/03/2024')
  })
})

describe('region spelling', () => {
  it('converts UK to US spelling', () => {
    expect(applyRegionSpelling('Behaviour and organisation stabilisation', 'US')).toBe(
      'Behavior and organization stabilization',
    )
  })

  it('converts US to UK spelling', () => {
    expect(applyRegionSpelling('Behavior and organization', 'UK')).toBe(
      'Behaviour and organisation',
    )
  })

  it('leaves international text unchanged', () => {
    const text = 'Behaviour and behavior mixed'
    expect(applyRegionSpelling(text, 'international')).toBe(text)
  })
})

describe('export assembly', () => {
  it('includes only accepted/edited sections with content', () => {
    const draft = createDischargeSummaryDraft({
      documentType: 'short_discharge_summary',
      region: 'UK',
      patientScoped: false,
    })
    draft.sections.header.currentContent = 'St Mary Hospital\nDischarge Summary'
    draft.sections.header.status = 'accepted'

    const labels: Record<string, string> = {}
    for (const s of getDischargeSummarySections('short_discharge_summary')) {
      labels[s.id] = s.labelEn
    }
    const text = assembleDischargeSummaryText(draft, labels)
    expect(text).toContain('St Mary Hospital')

    draft.sections.diagnoses.currentContent = 'F20.0 Schizophrenia'
    draft.sections.diagnoses.status = 'ai_generated'
    expect(isSectionIncludedInFinal(draft.sections.diagnoses)).toBe(false)
    const text2 = assembleDischargeSummaryText(draft, labels)
    expect(text2).not.toContain('F20.0')
  })
})

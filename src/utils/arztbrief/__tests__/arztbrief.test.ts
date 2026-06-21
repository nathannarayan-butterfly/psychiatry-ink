import { describe, expect, it } from 'vitest'
import { getArztbriefSectionIds, getArztbriefSections } from '../../../data/arztbriefSections'
import { buildArztbriefEvidenceBundle } from '../evidenceBundle'
import { createArztbriefDraft, isSectionIncludedInFinal } from '../draftOps'
import { assembleArztbriefText } from '../export'

describe('arztbrief section ordering', () => {
  it('kurzbrief has 13 sections in spec order', () => {
    const ids = getArztbriefSectionIds('kurzbrief')
    expect(ids).toHaveLength(13)
    expect(ids[0]).toBe('header')
    expect(ids[8]).toBe('therapie-verlauf')
    expect(ids[11]).toBe('closing')
    expect(ids[12]).toBe('signature')
  })

  it('langbrief has 24 sections', () => {
    const ids = getArztbriefSectionIds('langbrief')
    expect(ids).toHaveLength(24)
    expect(ids[ids.length - 1]).toBe('signature')
  })
})

describe('evidence bundle de-id', () => {
  it('flags isDeidentified and strips dates in manual context', () => {
    const bundle = buildArztbriefEvidenceBundle({
      documentType: 'kurzbrief',
      therapieVerlaufLength: 'standard',
      manualContext: 'Patient am 12.03.2024 aufgenommen.',
    })
    expect(bundle.isDeidentified).toBe(true)
    expect(bundle.summaryText).toContain('[DATUM]')
    expect(bundle.summaryText).not.toContain('12.03.2024')
  })
})

describe('export assembly', () => {
  it('includes only accepted/edited sections with content', () => {
    const draft = createArztbriefDraft({ documentType: 'kurzbrief', patientScoped: false })
    draft.sections.greeting.currentContent = 'Sehr geehrte Kollegin,'
    draft.sections.greeting.status = 'accepted'

    const labels: Record<string, string> = {}
    for (const s of getArztbriefSections('kurzbrief')) {
      labels[s.id] = s.labelDe
    }
    const text = assembleArztbriefText(draft, labels)
    expect(text).toContain('Sehr geehrte Kollegin')

    draft.sections.diagnosen.currentContent = 'F20.0 Schizophrenie'
    draft.sections.diagnosen.status = 'ai_generated'
    expect(isSectionIncludedInFinal(draft.sections.diagnosen)).toBe(false)
    const text2 = assembleArztbriefText(draft, labels)
    expect(text2).not.toContain('F20.0')
  })
})

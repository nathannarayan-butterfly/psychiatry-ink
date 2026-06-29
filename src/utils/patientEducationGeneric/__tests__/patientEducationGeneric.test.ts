import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getGenericEducationSectionIds,
  getGenericEducationSections,
  genericEducationSubjectKindLabel,
  GENERIC_EDUCATION_DISCLAIMER_DE,
  GENERIC_EDUCATION_DISCLAIMER_EN,
} from '../../../data/patientEducationGenericSections'
import {
  buildGenericEducationSystemPrompt,
  buildGenericEducationUserPrompt,
} from '../../../data/patientEducationGenericPrompts'
import {
  acceptAllSections,
  acceptSection,
  applyAiGeneratedSection,
  createGenericEducationDocument,
  isSectionIncludedInFinal,
  revertSection,
  toggleSectionIncluded,
  updateSectionContent,
} from '../draftOps'
import {
  assembleGenericEducationText,
  buildGenericEducationPrintHtml,
  printGenericEducationDocument,
  exportGenericEducationPdfDocument,
} from '../export'
import {
  buildEducationConsentHtml,
  getEducationConsentStrings,
} from '../consentSection'

function baseDoc() {
  return createGenericEducationDocument({
    subject: 'Sertralin',
    subjectKind: 'medikament',
    audience: 'patient',
    readingLevel: 'standard',
    detailStyle: 'standard',
    language: 'de',
    aiMode: 'standard',
  })
}

describe('generic education sections', () => {
  it('has a title section plus AI-capable sections', () => {
    const sections = getGenericEducationSections()
    expect(sections.length).toBeGreaterThanOrEqual(10)
    expect(sections[0]?.id).toBe('titel')
    expect(sections[0]?.localIdentity).toBe(true)
    expect(sections.filter((s) => s.aiCapable).length).toBeGreaterThanOrEqual(8)
  })

  it('every AI-capable section has prompt hints in both languages', () => {
    for (const s of getGenericEducationSections()) {
      expect(s.promptHintDe.length).toBeGreaterThan(0)
      expect(s.promptHintEn.length).toBeGreaterThan(0)
    }
  })

  it('exposes stable section ids', () => {
    const ids = getGenericEducationSectionIds()
    expect(ids).toContain('ueberblick')
    expect(ids).toContain('risiken-nebenwirkungen')
    expect(ids).toContain('warnzeichen')
  })

  it('localises subject kind labels', () => {
    expect(genericEducationSubjectKindLabel('erkrankung', 'de')).toBe('Erkrankung')
    expect(genericEducationSubjectKindLabel('erkrankung', 'en')).toBe('Condition')
  })
})

describe('generic education document ops', () => {
  it('creates a document with an auto-filled title section', () => {
    const doc = baseDoc()
    expect(doc.title).toContain('Sertralin')
    expect(doc.sections.titel?.currentContent).toContain('Sertralin')
    expect(doc.sections.titel?.status).toBe('auto_fetched')
    expect(doc.status).toBe('draft_ai_generated')
  })

  it('applies AI content, tracks references and usage, and supports revert', () => {
    let doc = baseDoc()
    doc = applyAiGeneratedSection(doc, 'ueberblick', 'Erste Fassung.', {
      provider: 'deepseek',
      model: 'x',
      mode: 'standard',
      inputTokens: 10,
      outputTokens: 20,
      creditsCharged: 2,
      references: [{ title: 'Leitlinie XY' }],
    })
    expect(doc.sections.ueberblick?.status).toBe('ai_generated')
    expect(doc.references).toHaveLength(1)
    expect(doc.aiUsageLog).toHaveLength(1)

    const edited = updateSectionContent(doc, 'ueberblick', 'Bearbeitete Fassung.')
    expect(edited.sections.ueberblick?.status).toBe('clinician_edited')

    // Re-generating stores the previous content so a revert can restore it.
    const regenerated = applyAiGeneratedSection(edited, 'ueberblick', 'Zweite Fassung.', {
      provider: 'deepseek',
      model: 'x',
      mode: 'standard',
      inputTokens: 10,
      outputTokens: 20,
      creditsCharged: 2,
    })
    const reverted = revertSection(regenerated, 'ueberblick')
    expect(reverted.sections.ueberblick?.currentContent).toBe('Bearbeitete Fassung.')
  })

  it('accept-all only promotes sections with content', () => {
    let doc = baseDoc()
    doc = applyAiGeneratedSection(doc, 'ueberblick', 'Inhalt.', {
      provider: 'p',
      model: 'm',
      mode: 'standard',
      inputTokens: 1,
      outputTokens: 1,
      creditsCharged: 1,
    })
    doc = acceptAllSections(doc)
    expect(doc.sections.ueberblick?.status).toBe('accepted')
    // an empty AI section stays out of the final document
    expect(isSectionIncludedInFinal(doc.sections['warnzeichen']!)).toBe(false)
  })

  it('excludes toggled-off sections and references from export', () => {
    let doc = baseDoc()
    doc = applyAiGeneratedSection(doc, 'ueberblick', 'Sichtbarer Abschnitt.', {
      provider: 'p',
      model: 'm',
      mode: 'standard',
      inputTokens: 1,
      outputTokens: 1,
      creditsCharged: 1,
      references: [{ title: 'Geheime Quelle', url: 'https://example.org' }],
    })
    doc = applyAiGeneratedSection(doc, 'nutzen', 'Versteckter Abschnitt.', {
      provider: 'p',
      model: 'm',
      mode: 'standard',
      inputTokens: 1,
      outputTokens: 1,
      creditsCharged: 1,
    })
    doc = acceptSection(doc, 'ueberblick')
    doc = acceptSection(doc, 'nutzen')
    doc = toggleSectionIncluded(doc, 'nutzen')

    const labels: Record<string, string> = {}
    for (const s of getGenericEducationSections()) labels[s.id] = s.labelDe
    const text = assembleGenericEducationText(doc, labels)

    expect(text).toContain('Sichtbarer Abschnitt.')
    expect(text).not.toContain('Versteckter Abschnitt.')
    // references are clinician-only and never exported
    expect(text).not.toContain('Geheime Quelle')
    // disclaimer is always appended
    expect(text).toContain(GENERIC_EDUCATION_DISCLAIMER_DE)
  })
})

describe('generic education prompts', () => {
  it('builds a JSON-constrained, PHI-free system prompt', () => {
    const prompt = buildGenericEducationSystemPrompt({
      subject: 'Depression',
      subjectKind: 'erkrankung',
      sectionLabel: 'Worum geht es?',
      promptHint: 'Erklären Sie das Thema.',
      audience: 'patient',
      readingLevel: 'einfache_sprache',
      detailStyle: 'kurz',
      language: 'de',
    })
    expect(prompt).toContain('JSON')
    expect(prompt).toContain('Depression')
    expect(prompt.toLowerCase()).toContain('patientendaten')
  })

  it('includes additional context only when provided', () => {
    const withContext = buildGenericEducationUserPrompt({
      subject: 'Lithium',
      subjectKind: 'medikament',
      sectionLabel: 'Risiken',
      additionalContext: 'Fokus auf Nierenfunktion',
      language: 'en',
    })
    expect(withContext).toContain('Fokus auf Nierenfunktion')

    const withoutContext = buildGenericEducationUserPrompt({
      subject: 'Lithium',
      subjectKind: 'medikament',
      sectionLabel: 'Risiken',
      language: 'en',
    })
    expect(withoutContext).not.toContain('Additional focus')
  })
})

describe('generic education disclaimers', () => {
  it('provides DE and EN disclaimers', () => {
    expect(GENERIC_EDUCATION_DISCLAIMER_DE.length).toBeGreaterThan(0)
    expect(GENERIC_EDUCATION_DISCLAIMER_EN.length).toBeGreaterThan(0)
  })
})

function labelsFor(): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const s of getGenericEducationSections()) labels[s.id] = s.labelDe
  return labels
}

function docWithContent() {
  let doc = baseDoc()
  doc = applyAiGeneratedSection(doc, 'ueberblick', 'Worum es geht.', {
    provider: 'p',
    model: 'm',
    mode: 'standard',
    inputTokens: 1,
    outputTokens: 1,
    creditsCharged: 1,
  })
  doc = acceptSection(doc, 'ueberblick')
  return doc
}

describe('education consent / signature block', () => {
  it('localises consent strings for de/en/fr/es', () => {
    for (const loc of ['de', 'en', 'fr', 'es'] as const) {
      const s = getEducationConsentStrings(loc)
      expect(s.heading.length).toBeGreaterThan(0)
      expect(s.understood.length).toBeGreaterThan(0)
      expect(s.accept.length).toBeGreaterThan(0)
      expect(s.reject.length).toBeGreaterThan(0)
      expect(s.patientHeading.length).toBeGreaterThan(0)
      expect(s.clinicianHeading.length).toBeGreaterThan(0)
      expect(s.signatureLabel.length).toBeGreaterThan(0)
    }
    // Each locale is distinct from the others (no untranslated copies).
    expect(getEducationConsentStrings('en').accept).not.toBe(
      getEducationConsentStrings('de').accept,
    )
    expect(getEducationConsentStrings('fr').accept).not.toBe(
      getEducationConsentStrings('es').accept,
    )
  })

  it('falls back to German for unknown locales', () => {
    expect(getEducationConsentStrings('xx')).toEqual(getEducationConsentStrings('de'))
  })

  it('renders patient + clinician signature lines and accept/reject choices', () => {
    const html = buildEducationConsentHtml('de')
    const de = getEducationConsentStrings('de')
    expect(html).toContain(de.understood)
    expect(html).toContain(de.accept)
    expect(html).toContain(de.reject)
    expect(html).toContain(de.patientHeading)
    expect(html).toContain(de.clinicianHeading)
    // Both parties get name/date/signature lines (3 each → 6 fields).
    expect(html.match(/pe-consent__field/g)?.length).toBe(6)
  })

  it('appends the consent block to the print/PDF/Word HTML', () => {
    const doc = docWithContent()
    const html = buildGenericEducationPrintHtml(doc, labelsFor(), 'Aufklärung')
    expect(html).toContain('Worum es geht.')
    const de = getEducationConsentStrings('de')
    expect(html).toContain(de.heading)
    expect(html).toContain(de.understood)
    expect(html).toContain(de.accept)
    expect(html).toContain(de.reject)
    // Consent block is the final block (after the disclaimer footnote).
    expect(html.indexOf('pe-disclaimer')).toBeLessThan(html.indexOf('pe-consent'))
  })

  it('honours an explicit consent locale override (e.g. French UI)', () => {
    const doc = docWithContent()
    const html = buildGenericEducationPrintHtml(doc, labelsFor(), 'Aufklärung', 'fr')
    expect(html).toContain(getEducationConsentStrings('fr').accept)
    expect(html).not.toContain(getEducationConsentStrings('de').accept)
  })
})

describe('education print/export path', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens a print window, writes the document and triggers print', () => {
    vi.useFakeTimers()
    const printSpy = vi.fn()
    let written = ''
    const fakeWin = {
      document: {
        open: vi.fn(),
        write: (chunk: string) => {
          written += chunk
        },
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: printSpy,
      setTimeout: (fn: () => void) => fn(),
    } as unknown as Window
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin)

    const doc = docWithContent()
    expect(() => printGenericEducationDocument(doc, labelsFor(), 'Aufklärung', 'de')).not.toThrow()

    expect(openSpy).toHaveBeenCalled()
    expect(written).toContain(getEducationConsentStrings('de').understood)
    expect(printSpy).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('does not throw when the popup is blocked (iframe fallback)', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const doc = docWithContent()
    expect(() => exportGenericEducationPdfDocument(doc, labelsFor(), 'Aufklärung', 'en')).not.toThrow()
  })
})

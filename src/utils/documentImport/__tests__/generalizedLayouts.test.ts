/**
 * Part 1 — generalization across clinic formats.
 *
 * These tests guard the broadened heading dictionary + multi-strategy date
 * association against regressions, and confirm the parser does NOT overfit to a
 * single clinic's two-column DOCX layout. They cover: single-column narrative,
 * right-column dates, English headings, bullet lists, header-only sections, and
 * free text with no tables/dates. A synthetic "sample clinic" fixture encodes the
 * must-keep behaviour (~10 anamnese sub-sections incl. psychopathologischer-befund
 * and ~23 dated verlauf entries from a flattened left-column table).
 */
import { describe, expect, it } from 'vitest'
import { docxTextToResult } from '../parsers/docxParser'

function candidatesFor(text: string) {
  return docxTextToResult(text).candidates
}

function modulesFor(text: string, module: string) {
  return candidatesFor(text).filter((c) => c.module === module)
}

describe('generalization — single-column narrative (no tables)', () => {
  it('splits a German narrative letter into one merged Aufnahmebefund', () => {
    const text = [
      'Anamnese',
      'Vorstellung zur stationären Behandlung.',
      '',
      'Psychopathologischer Befund',
      'Wach, allseits orientiert, Stimmung deutlich niedergedrückt.',
      '',
      'Sozialanamnese',
      'Lebt allein, berentet.',
    ].join('\n')

    const anamnese = modulesFor(text, 'anamnese')
    expect(anamnese).toHaveLength(1)
    if (anamnese[0]?.module !== 'anamnese') return
    expect(anamnese[0].data.sectionContents?.['psychopathologischer-befund']).toContain('niedergedrückt')
    expect(anamnese[0].data.sectionContents?.['sozialanamnese']).toContain('allein')
  })

  it('keeps an undated single-column verlauf as one candidate with leading-line dates', () => {
    const text = [
      'Verlauf',
      '12.03.2024',
      'Patient berichtet bessere Stimmung.',
      '15.03.2024',
      'Schlaf gebessert.',
    ].join('\n')

    const verlauf = modulesFor(text, 'verlauf')
    expect(verlauf.map((c) => (c.module === 'verlauf' ? c.data.date : undefined))).toEqual([
      '2024-03-12',
      '2024-03-15',
    ])
  })
})

describe('generalization — right-column dates', () => {
  it('associates trailing (right-column) dates with each note', () => {
    const text = [
      'Verlaufsdokumentation',
      'Patient stabil, keine Nebenwirkungen.\t12.03.2024',
      'Belastungserprobung besprochen.\t13.03.2024',
    ].join('\n')

    const verlauf = modulesFor(text, 'verlauf')
    expect(verlauf).toHaveLength(2)
    expect(verlauf.map((c) => (c.module === 'verlauf' ? c.data.date : undefined))).toEqual([
      '2024-03-12',
      '2024-03-13',
    ])
  })
})

describe('generalization — English headings', () => {
  it('maps English clinical headings to the right modules', () => {
    const text = [
      'History of present illness',
      'Three-week history of low mood.',
      '',
      'Mental status examination',
      'Alert, oriented, depressed affect.',
      '',
      'Clinical course',
      '12.03.2024\tImproved sleep reported.',
    ].join('\n')

    const anamnese = modulesFor(text, 'anamnese')
    expect(anamnese).toHaveLength(1)
    if (anamnese[0]?.module !== 'anamnese') return
    expect(anamnese[0].data.sectionContents?.['aktuelle-krankheitsanamnese']).toBeTruthy()
    expect(anamnese[0].data.sectionContents?.['psychopathologischer-befund']).toBeTruthy()
    expect(modulesFor(text, 'verlauf')).toHaveLength(1)
  })
})

describe('generalization — bullet lists', () => {
  it('produces one candidate per bulleted diagnosis / medication line', () => {
    const text = [
      'Diagnosen',
      '- F32.1 Mittelgradige depressive Episode',
      '- F41.1 Generalisierte Angststörung',
      '',
      'Medikation',
      '• Sertralin 50 mg 1-0-0',
      '• Quetiapin 25 mg 0-0-1',
    ].join('\n')

    expect(modulesFor(text, 'diagnosis')).toHaveLength(2)
    expect(modulesFor(text, 'medication')).toHaveLength(2)
  })
})

describe('generalization — robustness against false headings', () => {
  it('does not treat a long narrative paragraph mentioning Verlauf as a heading', () => {
    const longNarrative =
      'Im bisherigen Verlauf beschreibt der Patient mehrere alltagsnahe Situationen, ' +
      'die ausführlich geschildert werden und keinesfalls eine Überschrift darstellen sollen.'
    const text = ['Psychischer Befund', longNarrative].join('\n')

    const anamnese = modulesFor(text, 'anamnese')
    expect(anamnese).toHaveLength(1)
    expect(modulesFor(text, 'verlauf')).toHaveLength(0)
  })

  it('files an unrecognised heading as a low-confidence document candidate', () => {
    const text = ['Irgendein Freitext ohne klinische Überschrift.'].join('\n')
    const docs = modulesFor(text, 'document')
    expect(docs).toHaveLength(1)
    expect(docs[0].confidence).toBe('low')
  })
})

describe('regression — aufnahme letter structure (de-identified)', () => {
  const AUFNAHME_LETTER = [
    'Aufnahmeanlass und -umstände:',
    'Überstellung zur Optimierung der Therapie.',
    '',
    'Aktuelle Anamnese:',
    'Patient wortkarg, monoton im Kontakt.',
    '',
    'Psychiatrische Anamnese:',
    'Paranoide Schizophrenie vordiagnostiziert.',
    '',
    'Suchtmittelanamnese:',
    'Kein aktueller Substanzkonsum.',
    '',
    'Vorerkrankungen:',
    'Keine somatischen Vorerkrankungen bekannt.',
    '',
    'Körperlich-vegetative Anamnese:',
    'Schlaf und Appetit unauffällig.',
    '',
    'Familienanamnese:',
    'Keine Belastung in der Vorgeschichte.',
    '',
    'Sozialanamnese:',
    'Lebt seit Jahren in Deutschland.',
    '',
    'Forensische Anamnese:',
    'Wiederholte Inhaftierungen.',
    '',
    'Psychischer Befund:',
    'Wach, orientiert, affektiv verflacht.',
    '',
    'Neurologischer Befund:',
    'Keine fokal-neurologischen Defizite.',
    '',
    'Procedere:',
    'Medikation optimieren, Tagesstruktur fördern.',
    '',
    '09.12.2025',
    'Visite mit Frau Paval:',
    'Visite durchgeführt, Patient stabil.',
    '',
    '16.12.2025',
    'Visite mit Herrn Narayan:',
    'Schlaf verbessert, keine Nebenwirkungen.',
  ].join('\n')

  it('maps aufnahme sub-sections into one Aufnahmebefund and visit notes with leading dates', () => {
    const all = docxTextToResult(AUFNAHME_LETTER).candidates
    const anamnese = all.filter((c) => c.module === 'anamnese')
    expect(anamnese).toHaveLength(1)
    if (anamnese[0]?.module !== 'anamnese') return
    const sectionIds = Object.keys(anamnese[0].data.sectionContents ?? {})
    expect(sectionIds).toContain('aufnahmeanlass')
    expect(sectionIds).toContain('aktuelle-krankheitsanamnese')
    expect(sectionIds).toContain('psychiatrische-vorgeschichte')
    expect(sectionIds).toContain('somatischer-befund')

    const verlauf = all.filter((c) => c.module === 'verlauf')
    expect(verlauf).toHaveLength(2)
    expect(verlauf.map((c) => (c.module === 'verlauf' ? c.data.date : undefined))).toEqual([
      '2025-12-09',
      '2025-12-16',
    ])
  })
})

describe('regression — synthetic "sample clinic" layout must not degrade', () => {
  const SAMPLE_ANAMNESE = [
    'Aufnahmeanlass',
    'Notfallmäßige Vorstellung.',
    '',
    'Aktuelle Beschwerden',
    'Anhaltende Niedergeschlagenheit.',
    '',
    'Psychiatrische Vorgeschichte',
    'Zwei vorangegangene stationäre Aufenthalte.',
    '',
    'Somatische Anamnese',
    'Arterielle Hypertonie.',
    '',
    'Suchtanamnese',
    'Kein Substanzkonsum.',
    '',
    'Familienanamnese',
    'Vater mit depressiver Erkrankung.',
    '',
    'Fremdanamnese',
    'Angaben der Ehefrau liegen vor.',
    '',
    'Biografische Anamnese',
    'Aufgewachsen mit zwei Geschwistern.',
    '',
    'Sozialanamnese',
    'Berentet, lebt allein.',
    '',
    'Psychopathologischer Befund',
    'Wach, orientiert, deutlich depressiv.',
  ].join('\n')

  it('keeps 10 aufnahme sub-sections in one merged Aufnahmebefund', () => {
    const anamnese = docxTextToResult(SAMPLE_ANAMNESE).candidates.filter((c) => c.module === 'anamnese')
    expect(anamnese).toHaveLength(1)
    if (anamnese[0]?.module !== 'anamnese') return
    const ids = Object.keys(anamnese[0].data.sectionContents ?? {})
    expect(ids).toHaveLength(10)
    expect(ids).toContain('psychopathologischer-befund')
  })

  it('keeps 23 dated verlauf candidates from a flattened left-column table', () => {
    const rows = Array.from({ length: 23 }, (_, i) => {
      const day = String((i % 28) + 1).padStart(2, '0')
      return `${day}.03.2024\tVerlaufseintrag Nummer ${i + 1}.`
    })
    const text = ['Verlauf', ...rows].join('\n')

    const verlauf = modulesFor(text, 'verlauf')
    expect(verlauf).toHaveLength(23)
    expect(verlauf.every((c) => c.module === 'verlauf' && Boolean(c.data.date))).toBe(true)
  })
})

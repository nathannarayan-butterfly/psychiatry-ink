import { describe, expect, it } from 'vitest'
import { docxTextToResult, parseDocxFile } from '../parsers/docxParser'
import {
  mapSectionToCandidates,
  sectionizeClinicalText,
  parseDiagnosisLine,
  parseMedicationLine,
  parseLabLine,
} from '../sectionize'
import type { CandidateModule } from '../../../schemas/documentImport/envelope'

const CLINICAL_DOC = `Anamnese
Patient berichtet über Schlafstörungen seit drei Wochen.

Diagnosen
F32.1 Mittelgradige depressive Episode
F41.1 Generalisierte Angststörung

Medikation
Sertralin 50 mg 1-0-0
Quetiapin 25 mg 0-0-1

Labor
Natrium 140 mmol/l
Kalium 4.1 mmol/l

Therapie und Verlauf
Wöchentliche Gespräche geplant, gute Compliance.`

function moduleSet(text: string): CandidateModule[] {
  return docxTextToResult(text).candidates.map((c) => c.module)
}

describe('sectionizeClinicalText', () => {
  it('splits text into the named clinical sections', () => {
    const sections = sectionizeClinicalText(CLINICAL_DOC)
    expect(sections.map((s) => s.heading)).toEqual([
      'Anamnese',
      'Diagnosen',
      'Medikation',
      'Labor',
      'Therapie und Verlauf',
    ])
  })
})

describe('line parsers', () => {
  it('parses ICD-coded diagnosis lines', () => {
    expect(parseDiagnosisLine('F32.1 Mittelgradige depressive Episode')).toEqual({
      icd10Code: 'F32.1',
      label: 'Mittelgradige depressive Episode',
    })
  })
  it('parses medication lines into substance/strength/dose', () => {
    expect(parseMedicationLine('Sertralin 50 mg 1-0-0')).toEqual({
      substance: 'Sertralin',
      strength: '50 mg',
      doseText: '1-0-0',
    })
  })
  it('parses lab value lines', () => {
    expect(parseLabLine('Natrium 140 mmol/l')).toMatchObject({ name: 'Natrium', value: '140', unit: 'mmol/l' })
  })
})

describe('docxTextToResult', () => {
  it('produces section-based candidates for the named headings', () => {
    const modules = moduleSet(CLINICAL_DOC)
    expect(modules).toContain('anamnese')
    expect(modules).toContain('diagnosis')
    expect(modules).toContain('medication')
    expect(modules).toContain('lab')
    expect(modules).toContain('therapy')
  })

  it('maps Anamnese parent subheadings to anamnese candidates', () => {
    const result = docxTextToResult([
      'Anamnese',
      '',
      'Psychopathologischer Befund',
      'Wach, orientiert, affektiv niedergestimmt.',
      '',
      'Biografie',
      'Aufgewachsen mit zwei Geschwistern.',
    ].join('\n'))

    const anamnese = result.candidates.filter((c) => c.module === 'anamnese')
    expect(anamnese).toHaveLength(2)
    expect(anamnese.map((c) => c.module === 'anamnese' ? c.data.sectionId : undefined)).toEqual([
      'psychopathologischer-befund',
      'biografische-anamnese',
    ])
  })

  it('maps Aufnahmebefund parent subheadings and spelling variants to anamnese candidates', () => {
    const result = docxTextToResult([
      'Aufnahme Befund',
      '',
      'Psychopathalogischer Befund',
      'Formalgedanklich geordnet, keine Wahnsymptomatik.',
      '',
      'Somatischer Befund',
      'Kreislauf stabil, keine akuten Beschwerden.',
    ].join('\n'))

    const anamnese = result.candidates.filter((c) => c.module === 'anamnese')
    expect(anamnese).toHaveLength(2)
    expect(anamnese.every((c) => c.module === 'anamnese')).toBe(true)
    expect(anamnese.map((c) => c.module === 'anamnese' ? c.data.sectionId : undefined)).toEqual([
      'psychopathologischer-befund',
      'somatischer-befund',
    ])
  })

  it('maps compound anamnese and aufnahme headings from table-like exports', () => {
    const result = docxTextToResult([
      'Aufnahmeanlass und aktuelle Situation',
      'Vorstellung zur stationaeren Aufnahme.',
      '',
      'Befund / Fremdanamnese',
      'Fremdangaben liegen strukturiert vor.',
      '',
      'Suchtmittelanamnese',
      'Kein aktueller Substanzkonsum berichtet.',
    ].join('\n'))

    const anamnese = result.candidates.filter((c) => c.module === 'anamnese')
    expect(anamnese).toHaveLength(3)
    expect(anamnese.map((c) => c.module === 'anamnese' ? c.data.sectionId : undefined)).toEqual([
      'aufnahmeanlass',
      'fremdanamnese',
      'suchtanamnese',
    ])
  })

  it('does not split a long narrative paragraph just because it contains Verlauf', () => {
    const longNarrative = [
      'Patient nimmt Bezug auf den bisherigen Verlauf und beschreibt mehrere alltagsnahe Situationen',
      'ohne dass diese Zeile eine Ueberschrift sein soll.',
      'Die Formulierung ist absichtlich lang, damit sie wie ein aus einer Tabellenzelle',
      'extrahierter Fliesstext behandelt wird.',
    ].join(' ')
    const result = docxTextToResult([
      'Psychischer Befund',
      longNarrative,
      '',
      'Befund',
      'Weiterer kurzer Befundtext.',
    ].join('\n'))

    const psych = result.candidates.find(
      (c) => c.module === 'anamnese' && c.data.sectionId === 'psychopathologischer-befund',
    )
    expect(psych?.module).toBe('anamnese')
    if (psych?.module === 'anamnese') expect(psych.data.text).toContain('bisherigen Verlauf')
  })

  it('maps diagnosis headings with additional wording', () => {
    const result = docxTextToResult([
      'Diagnostische Einschaetzung bei Aufnahme',
      'F32.1 Mittelgradige depressive Episode',
    ].join('\n'))

    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].module).toBe('diagnosis')
  })

  it('creates one candidate per diagnosis/medication line', () => {
    const result = docxTextToResult(CLINICAL_DOC)
    expect(result.candidates.filter((c) => c.module === 'diagnosis')).toHaveLength(2)
    expect(result.candidates.filter((c) => c.module === 'medication')).toHaveLength(2)
    expect(result.candidates.filter((c) => c.module === 'lab')).toHaveLength(1)
  })

  it('maps an unknown heading to a document candidate', () => {
    const candidates = mapSectionToCandidates({ heading: 'Sonstiges', body: 'Freitext.', lineNumber: 1 })
    expect(candidates[0].module).toBe('document')
  })

  it('warns when nothing is recognised', () => {
    expect(docxTextToResult('').notices.some((n) => n.code === 'docx_no_candidates')).toBe(true)
  })
})

describe('parseDocxFile with injected extractor', () => {
  it('uses the injected text extractor (no mammoth needed)', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'letter.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    const result = await parseDocxFile(file, async () => 'Diagnosen\nF20.0 Schizophrenie')
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].module).toBe('diagnosis')
  })
})

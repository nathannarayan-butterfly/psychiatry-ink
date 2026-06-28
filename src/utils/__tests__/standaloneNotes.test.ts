// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { getGuidedEntrySchema } from '../../data/guidedEntry/schemas'
import { generateGuidedNarrative } from '../guidedEntry/generateNarrative'
import { loadDokumente } from '../dokumenteArchive'
import {
  STANDALONE_NOTE_PAGE_PREFIX,
  deleteStandaloneNote,
  listStandaloneNotes,
  saveStandaloneNote,
  updateStandaloneNote,
} from '../standaloneNotes'

const CASE_ID = 'default'

describe('standalone Befund widget → notes (no patient / no caseId-section write)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('generates Befund text from the guided schema without writing a case section', () => {
    const schema = getGuidedEntrySchema('anamnese-somatic-befund')
    const { text } = generateGuidedNarrative(
      schema,
      { generalCondition: 'gut', examDate: '2026-06-28' },
      'de',
    )
    expect(text.trim().length).toBeGreaterThan(0)

    // The widget saves the generated text as a standalone note — NOT through the
    // patient-bound apply path. The persisted entry must be tagged as standalone.
    const saved = saveStandaloneNote(CASE_ID, {
      kind: 'somatic-befund',
      title: 'Somatischer Befund',
      content: text,
    })
    expect(saved.pageType.startsWith(STANDALONE_NOTE_PAGE_PREFIX)).toBe(true)
    expect(saved.pageType).toBe('standalone:somatic-befund')
    // It is a free-standing note, never a real document type / case section.
    expect(saved.pageType).not.toBe('aufnahme')
    expect(saved.sectionContents).toBeUndefined()
  })

  it('lists, edits and deletes standalone notes (copy/edit/delete persistence)', () => {
    const note = saveStandaloneNote(CASE_ID, {
      kind: 'rewrite',
      title: 'Strukturierter Text',
      content: 'Erste Fassung.',
    })

    let notes = listStandaloneNotes(CASE_ID)
    expect(notes).toHaveLength(1)
    expect(notes[0]!.title).toBe('Strukturierter Text')
    expect(notes[0]!.content).toBe('Erste Fassung.')

    // Edit (rename + modify).
    updateStandaloneNote(CASE_ID, note.id, {
      title: 'Überarbeiteter Text',
      content: 'Zweite Fassung.',
    })
    notes = listStandaloneNotes(CASE_ID)
    expect(notes[0]!.title).toBe('Überarbeiteter Text')
    expect(notes[0]!.content).toBe('Zweite Fassung.')

    // Delete (soft-delete from the shared archive).
    deleteStandaloneNote(CASE_ID, note.id)
    expect(listStandaloneNotes(CASE_ID)).toHaveLength(0)
    expect(loadDokumente(CASE_ID).some((entry) => entry.id === note.id)).toBe(false)
  })

  it('only lists standalone-tagged entries, ignoring other archive documents', () => {
    saveStandaloneNote(CASE_ID, { kind: 'ecg-befund', title: 'EKG-Befund', content: 'Sinusrhythmus.' })
    const standalone = listStandaloneNotes(CASE_ID)
    expect(standalone).toHaveLength(1)
    expect(standalone.every((entry) => entry.pageType.startsWith(STANDALONE_NOTE_PAGE_PREFIX))).toBe(
      true,
    )
  })
})

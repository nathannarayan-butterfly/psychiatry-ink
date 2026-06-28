// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CASE_ID } from '../caseContext'
import { listStandaloneNotes, saveStandaloneNote } from '../standaloneNotes'
import {
  GLOBAL_NOTES_CASE_ID,
  deleteGlobalNote,
  listGlobalNotes,
  saveGlobalNote,
  updateGlobalNote,
} from '../standaloneNotes'

describe('global notes store (floating Notizen popup + dashboard widget)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is user-global: notes live under the default (non-patient) case', () => {
    expect(GLOBAL_NOTES_CASE_ID).toBe(DEFAULT_CASE_ID)
  })

  it('saves, lists, edits and soft-deletes global notes', () => {
    const note = saveGlobalNote({ kind: 'jot', title: 'Erste Notiz', content: 'Hallo Welt.' })
    let notes = listGlobalNotes()
    expect(notes).toHaveLength(1)
    expect(notes[0]!.title).toBe('Erste Notiz')

    updateGlobalNote(note.id, { title: 'Bearbeitet', content: 'Neuer Inhalt.' })
    notes = listGlobalNotes()
    expect(notes[0]!.title).toBe('Bearbeitet')
    expect(notes[0]!.content).toBe('Neuer Inhalt.')

    deleteGlobalNote(note.id)
    expect(listGlobalNotes()).toHaveLength(0)
  })

  it('persists rich (HTML) content verbatim so formatting survives a reload', () => {
    const html = '<p><strong>Fett</strong> und <em>kursiv</em> und <mark>markiert</mark>.</p>'
    saveGlobalNote({ kind: 'jot', title: 'Formatiert', content: html })
    const notes = listGlobalNotes()
    expect(notes[0]!.content).toBe(html)
  })

  it('shares one store with the standalone tools (tool saves appear in the popup list)', () => {
    // Standalone tools save under the default case via saveStandaloneNote — which
    // is exactly the global bucket, so their output shows up in the global list.
    saveStandaloneNote(DEFAULT_CASE_ID, {
      kind: 'summary',
      title: 'Werkzeug-Ergebnis',
      content: 'Von einem Werkzeug gespeichert.',
    })
    const globalNotes = listGlobalNotes()
    expect(globalNotes.some((n) => n.title === 'Werkzeug-Ergebnis')).toBe(true)
    // And listing via the standalone API on the default case sees it too.
    expect(listStandaloneNotes(DEFAULT_CASE_ID)).toHaveLength(1)
  })
})

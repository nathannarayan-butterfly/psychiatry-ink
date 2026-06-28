import { describe, expect, it } from 'vitest'
import { LAUNCHER_TASKS } from '../../../data/workspaceLauncher/launcherTasks'
import { filterLauncherTasksForContext } from '../filterLauncherTasks'

/** Does any visible task expose a mode whose target raises a requisition? */
function hasAnforderungMode(tasks: ReturnType<typeof filterLauncherTasksForContext>): boolean {
  return tasks.some((task) => task.modes.some((mode) => mode.target.kind === 'anforderung'))
}

/** Does any visible task expose a mode that opens the Konsil tab? */
function hasKonsilMode(tasks: ReturnType<typeof filterLauncherTasksForContext>): boolean {
  return tasks.some((task) =>
    task.modes.some(
      (mode) => mode.target.kind === 'topTab' && mode.target.tab === 'konsil',
    ),
  )
}

function ids(tasks: ReturnType<typeof filterLauncherTasksForContext>): string[] {
  return tasks.map((task) => task.id)
}

/** Every card that must vanish from the patient-less standalone workspace. */
const PATIENT_BOUND_CARDS = [
  'anamnese',
  'verlauf',
  'medikation',
  'labor',
  'befundung',
  'visualisation',
  'timeline',
  'therapieplanung',
  'diagnose',
  'discuss',
  'psychopath',
  'arztbrief',
  // Patientenaufklärung is hidden patient-less: its only standalone mode was the
  // mis-wired Vorlage/template picker, and it duplicated standalone-education.
  'patientenaufklaerung',
  // requisition / consultation cards lose all their modes and drop out too
  'anforderungen',
  'konsil',
]

/** Cards that stay available without a patient. */
const STANDALONE_KEPT_CARDS = [
  'standalone-befund',
  'standalone-rewrite',
  'standalone-knowledge',
  'standalone-medication',
  'standalone-education',
  'standalone-labviz',
  'standalone-verlauf',
  'standalone-timeline',
  'standalone-medlabor',
  'standalone-summary',
  'standalone-labinterpret',
  'formulare',
]

describe('filterLauncherTasksForContext', () => {
  const standalone = filterLauncherTasksForContext(LAUNCHER_TASKS, {
    hasPatient: false,
    canRequestAnforderungen: false,
  })
  const patient = filterLauncherTasksForContext(LAUNCHER_TASKS, {
    hasPatient: true,
    canRequestAnforderungen: true,
  })

  it('drops every patient-bound card in the standalone workspace', () => {
    for (const cardId of PATIENT_BOUND_CARDS) {
      expect(ids(standalone)).not.toContain(cardId)
    }
    // No requisition or consultation target survives anywhere.
    expect(hasAnforderungMode(standalone)).toBe(false)
    expect(hasKonsilMode(standalone)).toBe(false)
  })

  it('keeps every patient-bound card in a real patient case', () => {
    for (const cardId of PATIENT_BOUND_CARDS) {
      expect(ids(patient)).toContain(cardId)
    }
    expect(hasAnforderungMode(patient)).toBe(true)
    expect(hasKonsilMode(patient)).toBe(true)
  })

  it('hides the duplicate/mis-wired Patientenaufklärung card without a patient', () => {
    // The legacy patientenaufklaerung card (whose only standalone mode opened the
    // Vorlage/template picker) must not appear patient-less.
    expect(ids(standalone)).not.toContain('patientenaufklaerung')

    // The patient case still exposes the full Patientenaufklärung card.
    const patientAufklaerung = patient.find((t) => t.id === 'patientenaufklaerung')
    expect(patientAufklaerung).toBeDefined()
    const patientModeIds = patientAufklaerung!.modes.map((m) => m.id)
    expect(patientModeIds).toEqual(expect.arrayContaining(['generate', 'medication-education', 'form']))
  })

  it('exposes exactly ONE patient-education tool without a patient', () => {
    // Only the topic-driven standalone-education tool — no leftover
    // patientenaufklaerung duplicate.
    const educationCards = standalone.filter(
      (task) =>
        task.id === 'standalone-education' || task.id === 'patientenaufklaerung',
    )
    expect(educationCards.map((t) => t.id)).toEqual(['standalone-education'])
  })

  it('does NOT expose the full knowledge-base browser as a patient-less tool', () => {
    const allModes = standalone.flatMap((task) => task.modes)
    const opensFullKb = allModes.some(
      (mode) => mode.target.kind === 'standaloneTool' && mode.target.tool === ('knowledge' as never),
    )
    expect(opensFullKb).toBe(false)
    // The Ask-Butterfly card stays, but only as a focused Q&A (butterfly) mode.
    const butterfly = standalone.find((task) => task.id === 'standalone-knowledge')
    expect(butterfly).toBeDefined()
    expect(butterfly!.modes.map((m) => m.id)).toEqual(['butterfly'])
  })

  it('keeps the patient-independent card set without a patient', () => {
    for (const cardId of STANDALONE_KEPT_CARDS) {
      expect(ids(standalone)).toContain(cardId)
    }
  })

  it('surfaces at least 12 distinct patient-less tool cards', () => {
    const standaloneIds = ids(standalone)
    expect(new Set(standaloneIds).size).toBe(standaloneIds.length)
    expect(standaloneIds.length).toBeGreaterThanOrEqual(12)
  })

  it('keeps no patient-case-bound target in any standalone tool card', () => {
    // Every standalone tool routes to a standaloneTool / standaloneGuided / template
    // target — never a workspacePage/topTab/anforderung that reads or writes a case.
    const toolCards = standalone.filter((task) => task.id.startsWith('standalone-'))
    for (const task of toolCards) {
      for (const mode of task.modes) {
        expect(
          ['standaloneTool', 'standaloneGuided'],
          `${task.id}/${mode.id}`,
        ).toContain(mode.target.kind)
      }
    }
  })

  it('shows standalone-only tool cards only when there is no patient', () => {
    for (const standaloneCard of [
      'standalone-befund',
      'standalone-rewrite',
      'standalone-knowledge',
      'standalone-medication',
      'standalone-education',
    ]) {
      expect(ids(standalone)).toContain(standaloneCard)
      expect(ids(patient)).not.toContain(standaloneCard)
    }
  })

  it('never mutates the source registry', () => {
    const before = JSON.stringify(LAUNCHER_TASKS.map((t) => ({ id: t.id, modes: t.modes.length })))
    filterLauncherTasksForContext(LAUNCHER_TASKS, {
      hasPatient: false,
      canRequestAnforderungen: false,
    })
    const after = JSON.stringify(LAUNCHER_TASKS.map((t) => ({ id: t.id, modes: t.modes.length })))
    expect(after).toBe(before)
  })
})

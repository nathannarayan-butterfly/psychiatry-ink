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
  'formulare',
  'patientenaufklaerung',
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

  it('keeps Patientenaufklärung but only its template (form) mode without a patient', () => {
    const standaloneAufklaerung = standalone.find((t) => t.id === 'patientenaufklaerung')
    expect(standaloneAufklaerung).toBeDefined()
    const standaloneModeIds = standaloneAufklaerung!.modes.map((m) => m.id)
    expect(standaloneModeIds).toContain('form')
    expect(standaloneModeIds).not.toContain('generate')
    expect(standaloneModeIds).not.toContain('medication-education')

    // The patient case still exposes every Patientenaufklärung mode.
    const patientAufklaerung = patient.find((t) => t.id === 'patientenaufklaerung')
    const patientModeIds = patientAufklaerung!.modes.map((m) => m.id)
    expect(patientModeIds).toEqual(expect.arrayContaining(['generate', 'medication-education', 'form']))
  })

  it('keeps the patient-independent card set without a patient', () => {
    for (const cardId of STANDALONE_KEPT_CARDS) {
      expect(ids(standalone)).toContain(cardId)
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

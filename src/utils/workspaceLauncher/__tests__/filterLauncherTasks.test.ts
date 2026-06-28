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

describe('filterLauncherTasksForContext', () => {
  const standalone = filterLauncherTasksForContext(LAUNCHER_TASKS, {
    hasPatient: false,
    canRequestAnforderungen: false,
  })
  const patient = filterLauncherTasksForContext(LAUNCHER_TASKS, {
    hasPatient: true,
    canRequestAnforderungen: true,
  })

  it('drops the four patient-bound entries in the standalone workspace', () => {
    // 1. Labor → "Befund anfordern" (requisition mode) is gone…
    const standaloneLabor = standalone.find((t) => t.id === 'labor')
    expect(standaloneLabor).toBeDefined()
    expect(standaloneLabor!.modes.some((m) => m.id === 'anforderung')).toBe(false)
    // …but Labor itself (other modes) survives.
    expect(standaloneLabor!.modes.length).toBeGreaterThan(0)

    // 2. Discuss → "Konsil" mode is gone, Discuss card survives via "discuss".
    const standaloneDiscuss = standalone.find((t) => t.id === 'discuss')
    expect(standaloneDiscuss).toBeDefined()
    expect(standaloneDiscuss!.modes.some((m) => m.id === 'konsil')).toBe(false)
    expect(standaloneDiscuss!.modes.some((m) => m.id === 'discuss')).toBe(true)

    // 3 + 4. The standalone "Anforderungen" and "Konsil" cards are removed.
    expect(ids(standalone)).not.toContain('anforderungen')
    expect(ids(standalone)).not.toContain('konsil')

    // No requisition or consultation target survives anywhere.
    expect(hasAnforderungMode(standalone)).toBe(false)
    expect(hasKonsilMode(standalone)).toBe(false)
  })

  it('keeps all four patient-bound entries in a real patient case', () => {
    const patientLabor = patient.find((t) => t.id === 'labor')
    expect(patientLabor!.modes.some((m) => m.id === 'anforderung')).toBe(true)

    const patientDiscuss = patient.find((t) => t.id === 'discuss')
    expect(patientDiscuss!.modes.some((m) => m.id === 'konsil')).toBe(true)

    expect(ids(patient)).toContain('anforderungen')
    expect(ids(patient)).toContain('konsil')

    expect(hasAnforderungMode(patient)).toBe(true)
    expect(hasKonsilMode(patient)).toBe(true)
  })

  it('shows standalone-only tool cards only when there is no patient', () => {
    for (const standaloneCard of [
      'standalone-befund',
      'standalone-rewrite',
      'standalone-knowledge',
      'standalone-interactions',
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

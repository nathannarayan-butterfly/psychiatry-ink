import type {
  LauncherCreationMode,
  LauncherTask,
} from '../../data/workspaceLauncher/launcherTasks'

/**
 * Context that decides which Workspace Launcher entries are valid right now.
 *
 * - `hasPatient` — a real patient is linked to the active case. When `false`
 *   the workspace is the patient-less ("standalone") surface.
 * - `canRequestAnforderungen` — clinical requisitions (Anforderungen) can be
 *   raised, i.e. there is a linked patient on a non-default case. Anforderung-
 *   bound entries are dead ends without it.
 */
export interface LauncherFilterContext {
  hasPatient: boolean
  canRequestAnforderungen: boolean
}

/** A requisition-modal mode (Labor → "Befund anfordern", the Anforderungen card). */
function isAnforderungMode(mode: LauncherCreationMode): boolean {
  return mode.target.kind === 'anforderung'
}

/** A consultation (Konsil) mode (Discuss → "Konsil", the Konsil card). */
function isKonsilMode(mode: LauncherCreationMode): boolean {
  return mode.target.kind === 'topTab' && mode.target.tab === 'konsil'
}

/**
 * Pure helper that drops launcher entries that make no sense in the current
 * context, keeping the registry itself untouched (patient cases still expose
 * every entry).
 *
 * In the patient-less standalone workspace this removes the four patient-bound
 * entries that would otherwise dead-end:
 *   1. Labor → "Befund anfordern" (requisition mode)
 *   2. Discuss → "Konsil" (consultation mode)
 *   3. the whole "Anforderungen" card
 *   4. the whole "Konsil" card
 * Requisition entries are additionally gated by `canRequestAnforderungen`, so
 * they also disappear on any case that cannot raise requisitions.
 *
 * Conversely, `standaloneOnly` cards (the standalone generate-text / lookup
 * tools) are only shown when there is no patient — a real patient case uses the
 * equivalent patient-bound flows instead.
 *
 * Any card left with zero usable modes is dropped entirely.
 */
export function filterLauncherTasksForContext(
  tasks: LauncherTask[],
  context: LauncherFilterContext,
): LauncherTask[] {
  const { hasPatient, canRequestAnforderungen } = context

  const result: LauncherTask[] = []
  for (const task of tasks) {
    // Standalone-only tools never appear once a patient is linked.
    if (task.standaloneOnly && hasPatient) continue

    const modes = task.modes.filter((mode) => {
      if (!canRequestAnforderungen && isAnforderungMode(mode)) return false
      if (!hasPatient && isKonsilMode(mode)) return false
      return true
    })

    if (modes.length === 0) continue
    result.push(modes.length === task.modes.length ? task : { ...task, modes })
  }
  return result
}

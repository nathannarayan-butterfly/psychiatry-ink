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
 * Whole task cards that only make sense with a linked patient. In the patient-
 * less standalone workspace these are dropped entirely — every one of them
 * writes into / reads from a patient case (documentation sections, the
 * medication plan, labs, diagnostic coding, case discussion, the patient's
 * letters, etc.) and would otherwise dead-end. Their standalone equivalents
 * (`standalone-*` cards) provide the patient-independent capabilities instead.
 *
 * `patientenaufklaerung` is hidden too: its patient-less surface only exposed
 * the template/Vorlage picker (a mis-wired dead end that opened Formulare
 * categories) and it duplicated the topic-driven `standalone-education` tool.
 * The single correct patient-education entry point without a patient is
 * `standalone-education` (PatientEducationGenericWorkspace); Formulare still
 * provides template access.
 */
const PATIENT_BOUND_STANDALONE_HIDDEN_CARDS = new Set<string>([
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
  'patientenaufklaerung',
])

/**
 * Pure helper that drops launcher entries that make no sense in the current
 * context, keeping the registry itself untouched (patient cases still expose
 * every entry).
 *
 * In the patient-less standalone workspace this surfaces ONLY actions a
 * clinician can genuinely complete without a patient:
 *   - every patient-bound card is dropped entirely
 *     ({@link PATIENT_BOUND_STANDALONE_HIDDEN_CARDS}): anamnese, verlauf,
 *     medikation, labor, befundung, visualisation, timeline, therapieplanung,
 *     diagnose, discuss, psychopath, arztbrief, patientenaufklaerung (plus the
 *     requisition / konsil cards, which lose all their modes below);
 *   - the kept set is the `standalone-*` tool cards (including the single
 *     correct patient-education entry `standalone-education`) and Formulare.
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
    // Patient-bound cards are dropped entirely in the patient-less workspace.
    if (!hasPatient && PATIENT_BOUND_STANDALONE_HIDDEN_CARDS.has(task.id)) continue

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

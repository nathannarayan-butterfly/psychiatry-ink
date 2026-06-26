import { describe, expect, it } from 'vitest'
import { getDocumentType } from '../../../data/documentTypes'
import { NOTION_PAGES } from '../../../components/notion/notionPages'
import { parseTherapyPlanningSubsectionId } from '../../../data/therapyPageSections'
import { parseBefundungSubsectionId } from '../../../utils/befundungSubsections'
import { uiTranslations } from '../../../data/uiTranslations'
import { LAUNCHER_TASKS, getLauncherTask } from '../../../data/workspaceLauncher/launcherTasks'

const NOTION_PAGE_IDS = new Set(NOTION_PAGES.map((p) => p.id))
const TOP_TABS = new Set([
  'overview',
  'workspace',
  'verlauf',
  'diagnose',
  'labor',
  'medikation',
  'therapie',
  'dokumente',
  'discuss',
  'konsil',
  'ci',
])

describe('launcher task registry', () => {
  it('exposes the complete set of real clinical task cards', () => {
    const ids = LAUNCHER_TASKS.map((t) => t.id)
    for (const required of [
      'anamnese',
      'verlauf',
      'psychopath',
      'medikation',
      'labor',
      'befundung',
      'visualisation',
      'timeline',
      'therapieplanung',
      'diagnose',
      'arztbrief',
      'patientenaufklaerung',
      'formulare',
      'discuss',
    ]) {
      expect(ids).toContain(required)
    }
    // No duplicate ids.
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('does NOT expose dead cards for non-existent modules/templates', () => {
    const ids = LAUNCHER_TASKS.map((t) => t.id)
    // Gutachten / Antrag had no real module or template backing — they were removed.
    expect(ids).not.toContain('gutachten')
    expect(ids).not.toContain('antrag')
  })

  it('every task has a real i18n label/description and at least one mode', () => {
    for (const task of LAUNCHER_TASKS) {
      expect(uiTranslations[task.labelKey], task.id).toBeDefined()
      expect(uiTranslations[task.descKey], task.id).toBeDefined()
      expect(task.modes.length, task.id).toBeGreaterThan(0)
      expect(task.keywords.length, task.id).toBeGreaterThan(0)
    }
  })

  it('getLauncherTask resolves by id', () => {
    expect(getLauncherTask('psychopath')?.labelKey).toBe('launcherTaskPsychopath')
    expect(getLauncherTask('nope')).toBeUndefined()
  })

  it('every creation mode routes to a structurally valid, real target', () => {
    for (const task of LAUNCHER_TASKS) {
      for (const mode of task.modes) {
        expect(uiTranslations[mode.labelKey], `${task.id}/${mode.id}`).toBeDefined()
        const target = mode.target
        switch (target.kind) {
          case 'workspacePage': {
            expect(NOTION_PAGE_IDS.has(target.pageId), `${task.id}/${mode.id} page`).toBe(true)
            if (target.variantId) {
              // The variant must exist on the underlying document type.
              const docType = getDocumentType(target.pageId)
              const variantIds = docType?.variants?.map((v) => v.id) ?? []
              expect(variantIds, `${task.id}/${mode.id} variant`).toContain(target.variantId)
            }
            if (target.sectionId) {
              // Subsection ids must parse to a real section for their page kind:
              // therapieplanung → therapy-*, befundung → befund-ecg/befund-eeg.
              const resolved =
                target.pageId === 'befundung'
                  ? parseBefundungSubsectionId(target.sectionId)
                  : parseTherapyPlanningSubsectionId(target.sectionId)
              expect(resolved, `${task.id}/${mode.id} section`).not.toBeNull()
            }
            break
          }
          case 'topTab':
            expect(TOP_TABS.has(target.tab), `${task.id}/${mode.id} tab`).toBe(true)
            break
          case 'template':
          case 'anforderung':
            break
          case 'aiFeature':
            expect(
              ['lab-interpretation', 'aufklaerung'],
              `${task.id}/${mode.id} feature`,
            ).toContain(target.feature)
            break
          default: {
            const _exhaustive: never = target
            throw new Error(`unexpected target ${JSON.stringify(_exhaustive)}`)
          }
        }
      }
    }
  })
})

import { describe, expect, it } from 'vitest'
import { getDocumentType } from '../../../data/documentTypes'
import { NOTION_PAGES } from '../../../components/notion/notionPages'
import { parseTherapyPlanningSubsectionId } from '../../../data/therapyPageSections'
import { parseBefundungSubsectionId } from '../../../utils/befundungSubsections'
import { uiTranslations } from '../../../data/uiTranslations'
import { LAUNCHER_TASKS, getLauncherTask } from '../../../data/workspaceLauncher/launcherTasks'
import { listGuidedEntrySchemas } from '../../../data/guidedEntry/schemas'

const GUIDED_ITEM_TYPES = new Set(listGuidedEntrySchemas().map((schema) => schema.itemType))
const STANDALONE_TOOLS = new Set([
  'rewrite',
  'butterfly',
  'medication',
  'education',
  'labviz',
  'timeline',
  'medLabor',
  'summary',
  'labInterpret',
  'dictation',
  'translate',
])

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

  it('exposes the consolidated standalone tool cards', () => {
    const ids = LAUNCHER_TASKS.map((t) => t.id)
    expect(ids).toContain('standalone-medication')
    expect(ids).toContain('standalone-education')
    // The narrow interaction-only card was absorbed into the medication hub.
    expect(ids).not.toContain('standalone-interactions')
  })

  it('exposes the expanded patient-less tool-area cards', () => {
    const ids = LAUNCHER_TASKS.map((t) => t.id)
    for (const required of [
      'standalone-labviz',
      'standalone-verlauf',
      'standalone-timeline',
      'standalone-medlabor',
      'standalone-summary',
      'standalone-labinterpret',
    ]) {
      expect(ids).toContain(required)
    }
  })

  it('exposes a standalone EEG befund mode alongside ECG', () => {
    const befund = getLauncherTask('standalone-befund')
    const itemTypes = (befund?.modes ?? [])
      .map((m) => (m.target.kind === 'standaloneGuided' ? m.target.itemType : null))
      .filter(Boolean)
    expect(itemTypes).toContain('befund-ecg')
    expect(itemTypes).toContain('befund-eeg')
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
          case 'standaloneGuided':
            // The standalone Befund widgets must point at a real guided schema.
            expect(GUIDED_ITEM_TYPES.has(target.itemType), `${task.id}/${mode.id} itemType`).toBe(
              true,
            )
            break
          case 'standaloneTool':
            expect(STANDALONE_TOOLS.has(target.tool), `${task.id}/${mode.id} tool`).toBe(true)
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

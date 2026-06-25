import type { UiTranslationKey } from '../../data/uiTranslations'

/** Quick-action ids emitted from the Übersicht command header popover. */
export type OverviewQuickActionId =
  | 'newVerlaufNote'
  | 'dictateVisitNote'
  | 'psychopathFinding'
  | 'riskUpdate'
  | 'medicationChange'
  | 'sideEffectEntry'
  | 'labRequest'
  | 'consultRequest'
  | 'addTodo'
  | 'reviewAbnormalLabs'
  | 'reviewSafetyAlert'
  /** Handlers retained for signal chips / legacy callers — not in menu. */
  | 'saveForArztbrief'
  | 'diagnosisStatusUpdate'
  | 'ekgRequest'
  | 'drugLevelRequest'
  | 'therapySozialRequest'
  | 'scheduleFollowUp'
  | 'addReminder'
  | 'reviewOpenCriteria'
  | 'reviewAiHypotheses'
  | 'medicationReview'
  /** @deprecated alias — use reviewOpenCriteria */
  | 'reviewDiagnosisCriteria'
  /** @deprecated alias — use reviewAiHypotheses */
  | 'openAiPendingReview'
  /** @deprecated alias — use labRequest */
  | 'addAnforderung'

export type OverviewQuickActionLabelKey = UiTranslationKey

export type OverviewQuickActionSectionTitleKey =
  | 'overviewQuickActionSectionDocumentation'
  | 'overviewQuickActionSectionClinicalUpdates'
  | 'overviewQuickActionSectionRequests'
  | 'overviewQuickActionSectionTasks'
  | 'overviewQuickActionSectionReview'
  | 'overviewQuickActionSectionPriority'

export interface VisitActionPrioritizationContext {
  abnormalLabCount: number
  safetyAlertCount: number
  /** Calendar days since last documented contact; null when unknown. */
  daysSinceLastContact: number | null
}

export type OverviewQuickActionMenuBlock =
  | { type: 'section'; titleKey: OverviewQuickActionSectionTitleKey }
  | { type: 'item'; id: OverviewQuickActionId; labelKey: OverviewQuickActionLabelKey; priority?: boolean }

const DOCUMENTATION_ITEMS: OverviewQuickActionMenuBlock[] = [
  { type: 'item', id: 'newVerlaufNote', labelKey: 'overviewQuickActionNewVerlaufNote' },
  { type: 'item', id: 'dictateVisitNote', labelKey: 'overviewQuickActionDictateVisitNote' },
  { type: 'item', id: 'psychopathFinding', labelKey: 'overviewQuickActionPsychopathFinding' },
]

const CLINICAL_UPDATE_ITEMS: OverviewQuickActionMenuBlock[] = [
  { type: 'item', id: 'riskUpdate', labelKey: 'overviewQuickActionRiskUpdate' },
  { type: 'item', id: 'medicationChange', labelKey: 'overviewQuickActionMedicationChange' },
  { type: 'item', id: 'sideEffectEntry', labelKey: 'overviewQuickActionSideEffectEntry' },
]

const REQUEST_ITEMS: OverviewQuickActionMenuBlock[] = [
  { type: 'item', id: 'labRequest', labelKey: 'overviewQuickActionLabRequest' },
  { type: 'item', id: 'consultRequest', labelKey: 'overviewQuickActionConsultRequest' },
]

const TASK_ITEMS: OverviewQuickActionMenuBlock[] = [
  { type: 'item', id: 'addTodo', labelKey: 'overviewQuickActionAddTodo' },
]

const REVIEW_ITEM_DEFS: Array<{
  id: OverviewQuickActionId
  labelKey: OverviewQuickActionLabelKey
  when: (ctx: VisitActionPrioritizationContext) => boolean
}> = [
  {
    id: 'reviewSafetyAlert',
    labelKey: 'overviewQuickActionReviewSafetyAlert',
    when: (ctx) => ctx.safetyAlertCount > 0,
  },
  {
    id: 'reviewAbnormalLabs',
    labelKey: 'overviewQuickActionReviewAbnormalLabs',
    when: (ctx) => ctx.abnormalLabCount > 0,
  },
]

const ALL_MENU_ITEMS: OverviewQuickActionMenuBlock[] = [
  ...DOCUMENTATION_ITEMS,
  ...CLINICAL_UPDATE_ITEMS,
  ...REQUEST_ITEMS,
  ...TASK_ITEMS,
]

const MAX_PRIORITY_ITEMS = 2

const PRIORITY_CANDIDATES: Array<{
  id: OverviewQuickActionId
  when: (ctx: VisitActionPrioritizationContext) => boolean
}> = [
  { id: 'reviewSafetyAlert', when: (ctx) => ctx.safetyAlertCount > 0 },
  { id: 'reviewAbnormalLabs', when: (ctx) => ctx.abnormalLabCount > 0 },
  {
    id: 'newVerlaufNote',
    when: (ctx) => ctx.daysSinceLastContact !== null && ctx.daysSinceLastContact > 7,
  },
]

function findItem(id: OverviewQuickActionId): OverviewQuickActionMenuBlock | undefined {
  const fromGroup = ALL_MENU_ITEMS.find((block) => block.type === 'item' && block.id === id)
  if (fromGroup) return fromGroup
  const reviewDef = REVIEW_ITEM_DEFS.find((def) => def.id === id)
  if (reviewDef) {
    return { type: 'item', id: reviewDef.id, labelKey: reviewDef.labelKey }
  }
  return undefined
}

function buildReviewItems(context: VisitActionPrioritizationContext): OverviewQuickActionMenuBlock[] {
  return REVIEW_ITEM_DEFS.filter((def) => def.when(context)).map((def) => ({
    type: 'item' as const,
    id: def.id,
    labelKey: def.labelKey,
  }))
}

/** Default grouped menu (no adaptive reordering). */
export const OVERVIEW_QUICK_ACTION_BLOCKS: OverviewQuickActionMenuBlock[] = [
  { type: 'section', titleKey: 'overviewQuickActionSectionDocumentation' },
  ...DOCUMENTATION_ITEMS,
  { type: 'section', titleKey: 'overviewQuickActionSectionClinicalUpdates' },
  ...CLINICAL_UPDATE_ITEMS,
  { type: 'section', titleKey: 'overviewQuickActionSectionRequests' },
  ...REQUEST_ITEMS,
  { type: 'section', titleKey: 'overviewQuickActionSectionTasks' },
  ...TASK_ITEMS,
]

/** Reorder/highlight at most two urgent items from live case context. */
export function buildAdaptiveVisitActionBlocks(
  context: VisitActionPrioritizationContext,
): OverviewQuickActionMenuBlock[] {
  const priority: OverviewQuickActionMenuBlock[] = []

  for (const candidate of PRIORITY_CANDIDATES) {
    if (priority.length >= MAX_PRIORITY_ITEMS) break
    if (!candidate.when(context)) continue
    const item = findItem(candidate.id)
    if (item?.type === 'item') priority.push({ ...item, priority: true })
  }

  const priorityIds = new Set(
    priority.flatMap((block) => (block.type === 'item' ? [block.id] : [])),
  )

  const blocks: OverviewQuickActionMenuBlock[] = []
  if (priority.length > 0) {
    blocks.push({ type: 'section', titleKey: 'overviewQuickActionSectionPriority' })
    blocks.push(...priority)
  }

  const appendGroup = (
    titleKey: OverviewQuickActionSectionTitleKey,
    items: OverviewQuickActionMenuBlock[],
  ) => {
    const filtered = items.filter(
      (block) => block.type !== 'item' || !priorityIds.has(block.id),
    )
    if (filtered.length === 0) return
    blocks.push({ type: 'section', titleKey })
    blocks.push(...filtered)
  }

  appendGroup('overviewQuickActionSectionDocumentation', DOCUMENTATION_ITEMS)
  appendGroup('overviewQuickActionSectionClinicalUpdates', CLINICAL_UPDATE_ITEMS)
  appendGroup('overviewQuickActionSectionRequests', REQUEST_ITEMS)
  appendGroup('overviewQuickActionSectionTasks', TASK_ITEMS)

  const reviewItems = buildReviewItems(context).filter(
    (block) => block.type !== 'item' || !priorityIds.has(block.id),
  )
  if (reviewItems.length > 0) {
    blocks.push({ type: 'section', titleKey: 'overviewQuickActionSectionReview' })
    blocks.push(...reviewItems)
  }

  return blocks
}

/** Flat list of selectable menu items (for keyboard roving index). */
export function flattenOverviewQuickActionItems(
  blocks: OverviewQuickActionMenuBlock[] = OVERVIEW_QUICK_ACTION_BLOCKS,
): { id: OverviewQuickActionId; labelKey: OverviewQuickActionLabelKey; priority?: boolean }[] {
  return blocks.flatMap((block) => (block.type === 'item' ? [block] : []))
}

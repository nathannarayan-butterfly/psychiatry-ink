import type { UiTranslationKey } from '../../data/uiTranslations'
import type { OverviewWidgetId } from './overviewLayout'
import type { OverviewQuickActionId } from './overviewQuickActions'
import type { HeroSummaryData, StatusRibbonItem } from '../../components/notion/overview/types'
import type { SemanticTone } from '../../components/notion/overview/OverviewCard'

/** Semantic chip palette for the visit command header. */
export type ClinicalSignalChipTone = 'red' | 'amber' | 'blue' | 'green' | 'grey'

export type ClinicalSignalChipId =
  | 'safety'
  | 'abnormal-labs'
  | 'open-criteria'
  | 'review-course'
  | 'ai-review-pending'
  | 'medication-review'
  | 'last-contact-overdue'

export interface ClinicalSignalChip {
  id: ClinicalSignalChipId
  labelKey: UiTranslationKey
  tone: ClinicalSignalChipTone
  count?: number
  /** Prefer scrolling to an overview widget; fall back to a visit action when absent. */
  widgetId?: OverviewWidgetId
  action?: OverviewQuickActionId
}

const TONE_TO_CHIP: Record<SemanticTone, ClinicalSignalChipTone> = {
  high: 'red',
  moderate: 'amber',
  info: 'blue',
  low: 'green',
  ok: 'green',
  neutral: 'grey',
}

function ribbonTone(tone: SemanticTone): ClinicalSignalChipTone {
  return TONE_TO_CHIP[tone] ?? 'grey'
}

export interface BuildClinicalSignalChipsInput {
  hero: HeroSummaryData
  safetyAlertCount: number
  abnormalLabCount: number
  butterflyOpenCount: number
  verlaufNeedsReview: boolean
  aiReviewPendingCount: number
  medicationReviewDue: boolean
  lastContactOverdue: boolean
  hasButterflyWidget: boolean
  hasCiWidgets: boolean
}

/** Map existing status-ribbon sources into clickable command-header chips. */
export function buildClinicalSignalChips(input: BuildClinicalSignalChipsInput): ClinicalSignalChip[] {
  const chips: ClinicalSignalChip[] = []

  const safetyCount = input.safetyAlertCount + (input.hero.risk?.tone === 'high' || input.hero.risk?.tone === 'moderate' ? 1 : 0)
  if (safetyCount > 0 || input.hero.alertCount > 0) {
    chips.push({
      id: 'safety',
      labelKey: 'overviewChipSafety',
      tone: input.hero.risk?.tone === 'high' ? 'red' : input.hero.alertCount > 0 ? 'amber' : 'grey',
      count: Math.max(input.hero.alertCount, safetyCount) || undefined,
      widgetId: 'safety',
      action: 'reviewSafetyAlert',
    })
  }

  if (input.abnormalLabCount > 0) {
    chips.push({
      id: 'abnormal-labs',
      labelKey: 'overviewChipAbnormalLabs',
      tone: 'amber',
      count: input.abnormalLabCount,
      widgetId: 'labs-due',
      action: 'reviewAbnormalLabs',
    })
  }

  if (input.butterflyOpenCount > 0) {
    chips.push({
      id: 'open-criteria',
      labelKey: 'overviewChipOpenCriteria',
      tone: 'blue',
      count: input.butterflyOpenCount,
      widgetId: input.hasButterflyWidget ? 'butterfly-criteria' : undefined,
      action: 'reviewOpenCriteria',
    })
  }

  if (input.verlaufNeedsReview) {
    chips.push({
      id: 'review-course',
      labelKey: 'overviewChipReviewCourse',
      tone: 'blue',
      widgetId: 'verlaufstendenz',
    })
  }

  if (input.aiReviewPendingCount > 0 && input.hasCiWidgets) {
    chips.push({
      id: 'ai-review-pending',
      labelKey: 'overviewChipAiReviewPending',
      tone: 'blue',
      count: input.aiReviewPendingCount,
      widgetId: 'ci-status',
      action: 'reviewAiHypotheses',
    })
  }

  if (input.medicationReviewDue) {
    chips.push({
      id: 'medication-review',
      labelKey: 'overviewChipMedicationReview',
      tone: 'amber',
      widgetId: 'medication',
      action: 'medicationReview',
    })
  }

  if (input.lastContactOverdue) {
    chips.push({
      id: 'last-contact-overdue',
      labelKey: 'overviewChipLastContactOverdue',
      tone: 'amber',
      action: 'newVerlaufNote',
    })
  }

  return chips
}

/** @deprecated Status ribbon retained for print/export compatibility. */
export function statusRibbonFromChips(chips: ClinicalSignalChip[], hero: HeroSummaryData): StatusRibbonItem[] {
  void chips
  return hero.statusRibbon
}

export { ribbonTone }

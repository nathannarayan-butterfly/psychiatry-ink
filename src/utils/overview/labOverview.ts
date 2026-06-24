import type { MedicationEntry } from '../../types/medicationPlan'
import type { LaborBefund } from '../laborArchive'
import type { VerlaufFeedEntry } from '../verlaufFeed'
import type { LabsDueData, ParameterMonitoringRow } from '../../components/notion/overview/types'
import type { RecentLabResultItem } from './recentLabResults'
import { buildLabsDue } from './labsDue'
import { getParameterMonitoringRows } from './medicationMonitoring'
import { buildRecentLabResults } from './recentLabResults'

export interface LaborOverviewData extends LabsDueData {
  medicationMonitoring: ParameterMonitoringRow[]
  /** Auffällige Werte aus dem jüngsten Laborbefund (nicht nur medikationsrelevant). */
  recentAbnormal: RecentLabResultItem[]
}

export function buildLaborOverview(input: {
  befunde: LaborBefund[]
  medications: MedicationEntry[]
  activeSubstances: string[]
  verlaufEntries?: VerlaufFeedEntry[]
}): LaborOverviewData {
  const labsDue = buildLabsDue({
    befunde: input.befunde,
    activeSubstances: input.activeSubstances,
  })
  const medicationMonitoring = getParameterMonitoringRows({
    medications: input.medications,
    befunde: input.befunde,
    verlaufEntries: input.verlaufEntries,
  })
  const recentAbnormal = buildRecentLabResults(input.befunde, 8).filter((item) => item.abnormal)

  return {
    ...labsDue,
    medicationMonitoring,
    recentAbnormal,
  }
}

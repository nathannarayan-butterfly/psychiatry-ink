import type { MedicationEntry } from '../../types/medicationPlan'
import type { LaborBefund } from '../laborArchive'
import type { LabsDueData } from '../../components/notion/overview/types'
import type { MedicationMonitoringGroup } from '../../components/notion/overview/types'
import type { RecentLabResultItem } from './recentLabResults'
import { buildLabsDue } from './labsDue'
import { getMedicationMonitoringGroups } from './medicationMonitoring'
import { buildRecentLabResults } from './recentLabResults'

export interface LaborOverviewData extends LabsDueData {
  medicationMonitoring: MedicationMonitoringGroup[]
  /** Auffällige Werte aus dem jüngsten Laborbefund (nicht nur medikationsrelevant). */
  recentAbnormal: RecentLabResultItem[]
}

export function buildLaborOverview(input: {
  befunde: LaborBefund[]
  medications: MedicationEntry[]
  activeSubstances: string[]
}): LaborOverviewData {
  const labsDue = buildLabsDue({
    befunde: input.befunde,
    activeSubstances: input.activeSubstances,
  })
  const medicationMonitoring = getMedicationMonitoringGroups({
    medications: input.medications,
    befunde: input.befunde,
  })
  const recentAbnormal = buildRecentLabResults(input.befunde, 8).filter((item) => item.abnormal)

  return {
    ...labsDue,
    medicationMonitoring,
    recentAbnormal,
  }
}

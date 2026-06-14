import type { LaborValue, LaborBefund } from '../laborArchive'
import { loadBefunde } from '../laborArchive'
import { loadLabGraphsList } from '../labPersistence'
import { getLabValueStatus } from '../../types/lab'
import type {
  LabAbnormalityType,
  LabBefundSnapshotInput,
  LabObservationInput,
  LabSnapshotParameterInput,
} from '../../types/labMedicationCorrelation'
import { normalizeLabParameter } from './parameterNormalize'

function detectAbnormality(value: LaborValue): LabAbnormalityType {
  if (value.isAbnormal === true) {
    if (typeof value.numericValue === 'number') {
      if (value.refMax != null && value.numericValue > value.refMax * 1.5) return 'critical'
      if (value.refMin != null && value.numericValue < value.refMin * 0.5) return 'critical'
      if (value.refMax != null && value.numericValue > value.refMax) return 'high'
      if (value.refMin != null && value.numericValue < value.refMin) return 'low'
    }
    return 'high'
  }

  if (typeof value.numericValue === 'number') {
    if (value.refMax != null && value.numericValue > value.refMax) return 'high'
    if (value.refMin != null && value.numericValue < value.refMin) return 'low'
  }

  return 'normal'
}

function detectAbnormalityFromGraph(
  numericValue: number,
  refMin: number | null,
  refMax: number | null,
): LabAbnormalityType {
  const status = getLabValueStatus(numericValue, refMin, refMax)
  if (status === 'high') {
    if (refMax != null && numericValue > refMax * 1.5) return 'critical'
    return 'high'
  }
  if (status === 'low') {
    if (refMin != null && numericValue < refMin * 0.5) return 'critical'
    return 'low'
  }
  return 'normal'
}

function detectTrend(prev: LaborValue, latest: LaborValue): 'rising' | 'falling' | 'stable' | undefined {
  const a = prev.numericValue
  const b = latest.numericValue
  if (typeof a !== 'number' || typeof b !== 'number') return undefined
  const delta = b - a
  const threshold = Math.max(Math.abs(a) * 0.1, 0.01)
  if (delta > threshold) return 'rising'
  if (delta < -threshold) return 'falling'
  return 'stable'
}

function formatRefRange(value: LaborValue): string | undefined {
  if (value.refText?.trim()) return value.refText.trim()
  if (value.refMin != null && value.refMax != null) return `${value.refMin}–${value.refMax}`
  if (value.refMin != null) return `≥ ${value.refMin}`
  if (value.refMax != null) return `≤ ${value.refMax}`
  return undefined
}

function formatRefRangeFromNumbers(refMin?: number, refMax?: number): string | undefined {
  if (refMin != null && refMax != null) return `${refMin}–${refMax}`
  if (refMin != null) return `≥ ${refMin}`
  if (refMax != null) return `≤ ${refMax}`
  return undefined
}

function laborValueToParameter(val: LaborValue): LabSnapshotParameterInput | null {
  const normalizedParameter = normalizeLabParameter(val.name)
  if (!normalizedParameter) return null
  return {
    parameterName: val.name,
    normalizedParameter,
    value: val.value,
    numericValue: val.numericValue,
    unit: val.unit,
    refMin: val.refMin,
    refMax: val.refMax,
    refText: formatRefRange(val),
    abnormality: detectAbnormality(val),
  }
}

function befundToSnapshot(befund: LaborBefund): LabBefundSnapshotInput {
  const parameters: LabSnapshotParameterInput[] = []
  for (const cat of befund.categories) {
    for (const val of cat.values) {
      const param = laborValueToParameter(val)
      if (param) parameters.push(param)
    }
  }
  return {
    befundId: befund.id,
    labDate: befund.date,
    label: befund.label,
    source: 'labor_befund',
    parameters,
  }
}

function graphEntriesToSnapshots(caseId: string): LabBefundSnapshotInput[] {
  const graphs = loadLabGraphsList(caseId)
  const byDate = new Map<string, LabSnapshotParameterInput[]>()

  for (const graph of graphs) {
    for (const entry of graph.entries) {
      const normalizedParameter = normalizeLabParameter(entry.parameter)
      if (!normalizedParameter) continue
      const refMin = entry.referenceLow ?? undefined
      const refMax = entry.referenceHigh ?? undefined
      const param: LabSnapshotParameterInput = {
        parameterName: entry.parameter,
        normalizedParameter,
        value: String(entry.value),
        numericValue: entry.value,
        unit: entry.unit,
        refMin,
        refMax,
        refText: formatRefRangeFromNumbers(refMin, refMax),
        abnormality: detectAbnormalityFromGraph(
          entry.value,
          entry.referenceLow,
          entry.referenceHigh,
        ),
      }
      const list = byDate.get(entry.date) ?? []
      const existingIdx = list.findIndex((p) => p.normalizedParameter === normalizedParameter)
      if (existingIdx >= 0) list[existingIdx] = param
      else list.push(param)
      byDate.set(entry.date, list)
    }
  }

  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([labDate, parameters]) => ({
      befundId: `lab-graph:${labDate}`,
      labDate,
      source: 'lab_graph' as const,
      parameters,
    }))
}

function mergeSnapshots(
  befundeSnapshots: LabBefundSnapshotInput[],
  graphSnapshots: LabBefundSnapshotInput[],
): LabBefundSnapshotInput[] {
  const byDate = new Map<string, LabBefundSnapshotInput>()
  for (const snap of [...befundeSnapshots, ...graphSnapshots]) {
    const existing = byDate.get(snap.labDate)
    if (!existing) {
      byDate.set(snap.labDate, snap)
      continue
    }
    const paramMap = new Map(existing.parameters.map((p) => [p.normalizedParameter, p]))
    for (const p of snap.parameters) {
      paramMap.set(p.normalizedParameter, p)
    }
    byDate.set(snap.labDate, {
      ...existing,
      parameters: [...paramMap.values()],
    })
  }
  return [...byDate.values()].sort((a, b) => b.labDate.localeCompare(a.labDate))
}

/** Most recent two lab result sets with full parameter lists. */
export function collectLastTwoLabSnapshots(caseId: string): LabBefundSnapshotInput[] {
  const befundeSnapshots = loadBefunde(caseId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(befundToSnapshot)
  const graphSnapshots = graphEntriesToSnapshots(caseId)
  return mergeSnapshots(befundeSnapshots, graphSnapshots).slice(0, 2)
}

function parameterToObservation(
  param: LabSnapshotParameterInput,
  snap: LabBefundSnapshotInput,
  trend?: 'rising' | 'falling' | 'stable',
): LabObservationInput {
  return {
    parameterName: param.parameterName,
    normalizedParameter: param.normalizedParameter,
    value: param.value,
    numericValue: param.numericValue,
    unit: param.unit,
    refMin: param.refMin,
    refMax: param.refMax,
    refText: param.refText,
    abnormality: param.abnormality,
    labDate: snap.labDate,
    befundId: snap.befundId,
    trend,
  }
}

/** Abnormal or trend-changed parameters from the last two lab snapshots. */
export function collectLabObservations(caseId: string): LabObservationInput[] {
  const snapshots = collectLastTwoLabSnapshots(caseId)
  if (snapshots.length === 0) return []

  const latest = snapshots[0]!
  const previous = snapshots[1]
  const observations: LabObservationInput[] = []

  for (const param of latest.parameters) {
    const prevParam = previous?.parameters.find(
      (p) => p.normalizedParameter === param.normalizedParameter,
    )
    let trend: 'rising' | 'falling' | 'stable' | undefined
    if (prevParam && param.numericValue != null && prevParam.numericValue != null) {
      trend = detectTrend(
        { ...prevParam, name: prevParam.parameterName } as LaborValue,
        { ...param, name: param.parameterName } as LaborValue,
      )
    }

    const isAbnormal = param.abnormality !== 'normal'
    const isTrending =
      param.abnormality === 'normal' &&
      (trend === 'rising' || trend === 'falling')

    if (isAbnormal) {
      observations.push(
        parameterToObservation(
          param,
          latest,
          trend,
        ),
      )
    } else if (isTrending) {
      observations.push(
        parameterToObservation(
          { ...param, abnormality: 'normal_but_changed' },
          latest,
          trend,
        ),
      )
    }
  }

  return observations.sort((a, b) => b.labDate.localeCompare(a.labDate))
}

/** Latest value per parameter across snapshots — used when no abnormal values exist. */
export function collectLatestLabParameters(snapshots: LabBefundSnapshotInput[]): LabObservationInput[] {
  if (snapshots.length === 0) return []
  const latest = snapshots[0]!
  return latest.parameters.map((param) => parameterToObservation(param, latest))
}

/**
 * Simplified compliance status for standard edition (yes / partial / no).
 * Enterprise edition keeps the full 14-day per-item grid; aggregate overrides
 * are stored separately so day-level data is never lost on tier change.
 */

import { caseStorageKey } from '../caseContext'

export type ComplianceAggregateStatus = 'yes' | 'partial' | 'no'

const COMPLIANCE_AGGREGATE_KEY = 'psychiatry-ink:complianceAggregate'

const VALID_STATUSES: ComplianceAggregateStatus[] = ['yes', 'partial', 'no']

export interface ComplianceAggregateOverride {
  itemKey: string
  status: ComplianceAggregateStatus
  updatedAt: string
}

function aggregateKey(caseId?: string): string {
  return caseStorageKey(COMPLIANCE_AGGREGATE_KEY, caseId)
}

function isValidOverride(value: unknown): value is ComplianceAggregateOverride {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.itemKey === 'string' &&
    typeof candidate.status === 'string' &&
    VALID_STATUSES.includes(candidate.status as ComplianceAggregateStatus)
  )
}

/** Maps a scored percent to yes / partial / no (same thresholds as overview tone). */
export function percentToAggregateStatus(percent: number | null): ComplianceAggregateStatus | null {
  if (percent == null) return null
  if (percent >= 80) return 'yes'
  if (percent >= 50) return 'partial'
  return 'no'
}

export function aggregateStatusTone(
  status: ComplianceAggregateStatus | null,
): 'ok' | 'moderate' | 'high' | 'neutral' {
  if (status === 'yes') return 'ok'
  if (status === 'partial') return 'moderate'
  if (status === 'no') return 'high'
  return 'neutral'
}

export function loadComplianceAggregateOverrides(caseId?: string): ComplianceAggregateOverride[] {
  try {
    const raw = localStorage.getItem(aggregateKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidOverride).map((entry) => ({
      itemKey: entry.itemKey,
      status: entry.status,
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString(),
    }))
  } catch {
    return []
  }
}

export function saveComplianceAggregateOverrides(
  overrides: ComplianceAggregateOverride[],
  caseId?: string,
): void {
  try {
    localStorage.setItem(aggregateKey(caseId), JSON.stringify(overrides))
  } catch {
    // ignore storage quota errors
  }
}

export function setComplianceAggregateOverride(
  itemKey: string,
  status: ComplianceAggregateStatus,
  caseId?: string,
): ComplianceAggregateOverride[] {
  const existing = loadComplianceAggregateOverrides(caseId)
  const next = existing.filter((entry) => entry.itemKey !== itemKey)
  next.push({ itemKey, status, updatedAt: new Date().toISOString() })
  saveComplianceAggregateOverrides(next, caseId)
  return next
}

export function resolveItemAggregateStatus(
  itemKey: string,
  percent: number | null,
  overrides: ComplianceAggregateOverride[],
): { status: ComplianceAggregateStatus | null; overridden: boolean } {
  const override = overrides.find((entry) => entry.itemKey === itemKey)
  if (override) {
    return { status: override.status, overridden: true }
  }
  return { status: percentToAggregateStatus(percent), overridden: false }
}

export function averageAggregateStatus(
  statuses: Array<ComplianceAggregateStatus | null>,
): ComplianceAggregateStatus | null {
  const percents: number[] = []
  for (const status of statuses) {
    if (status === 'yes') percents.push(100)
    else if (status === 'partial') percents.push(65)
    else if (status === 'no') percents.push(25)
  }
  if (percents.length === 0) return null
  const average = Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length)
  return percentToAggregateStatus(average)
}

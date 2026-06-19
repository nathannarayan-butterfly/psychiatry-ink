/**
 * Manual compliance overrides — clinician-set day statuses that take precedence
 * over the status derived from Verlauf notes / adherence signals.
 *
 * Stored in localStorage under `psychiatry-ink:complianceOverrides::{caseId}`,
 * mirroring the case-scoped pattern used by the Verlauf feed and annotations.
 * The feed/derivation stays read-only; overrides are layered on top at render
 * time so deleting an override cleanly reverts a day to its derived status.
 */

import { caseStorageKey } from '../caseContext'
import {
  computeCompliancePercent,
  type ComplianceDayStatus,
  type ComplianceItemTimeline,
} from './complianceSummary'

const COMPLIANCE_OVERRIDES_KEY = 'psychiatry-ink:complianceOverrides'

export interface ComplianceOverride {
  /** Stable medication id / therapy key the override applies to. */
  itemKey: string
  /** Calendar day in local time (`YYYY-MM-DD`). */
  dateIso: string
  /** Manually chosen status for that day + item. */
  status: ComplianceDayStatus
  /** ISO timestamp of the last manual edit. */
  updatedAt: string
}

const VALID_STATUSES: ComplianceDayStatus[] = ['participated', 'refused', 'excused', 'unknown']

function overridesKey(caseId?: string): string {
  return caseStorageKey(COMPLIANCE_OVERRIDES_KEY, caseId)
}

function isValidOverride(value: unknown): value is ComplianceOverride {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.itemKey === 'string' &&
    typeof candidate.dateIso === 'string' &&
    typeof candidate.status === 'string' &&
    VALID_STATUSES.includes(candidate.status as ComplianceDayStatus)
  )
}

export function overrideMapKey(itemKey: string, dateIso: string): string {
  return `${itemKey}::${dateIso}`
}

export function loadComplianceOverrides(caseId?: string): ComplianceOverride[] {
  try {
    const raw = localStorage.getItem(overridesKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidOverride).map((entry) => ({
      itemKey: entry.itemKey,
      dateIso: entry.dateIso,
      status: entry.status,
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString(),
    }))
  } catch {
    return []
  }
}

export function saveComplianceOverrides(overrides: ComplianceOverride[], caseId?: string): void {
  try {
    localStorage.setItem(overridesKey(caseId), JSON.stringify(overrides))
  } catch {
    // ignore storage quota errors
  }
}

/** Upserts a manual override and persists the new list. */
export function setComplianceOverride(
  itemKey: string,
  dateIso: string,
  status: ComplianceDayStatus,
  caseId?: string,
): ComplianceOverride[] {
  const existing = loadComplianceOverrides(caseId)
  const next = existing.filter(
    (entry) => !(entry.itemKey === itemKey && entry.dateIso === dateIso),
  )
  next.push({ itemKey, dateIso, status, updatedAt: new Date().toISOString() })
  saveComplianceOverrides(next, caseId)
  return next
}

/** Removes a manual override (reverts the day to its derived status) and persists. */
export function removeComplianceOverride(
  itemKey: string,
  dateIso: string,
  caseId?: string,
): ComplianceOverride[] {
  const existing = loadComplianceOverrides(caseId)
  const next = existing.filter(
    (entry) => !(entry.itemKey === itemKey && entry.dateIso === dateIso),
  )
  saveComplianceOverrides(next, caseId)
  return next
}

/**
 * Layers manual overrides on top of derived per-item timelines.
 *
 * Unlike `mergeComplianceDayStatus` (which resolves multiple derived signals by
 * severity priority), a manual override *replaces* the derived status outright —
 * the clinician's explicit call wins. Percentages are recomputed for any item
 * whose days changed so the row + overall numbers reflect the overrides.
 */
export function applyComplianceOverrides(
  items: ComplianceItemTimeline[],
  overrides: ComplianceOverride[],
): ComplianceItemTimeline[] {
  if (overrides.length === 0) return items
  const byKey = new Map<string, ComplianceDayStatus>()
  for (const override of overrides) {
    byKey.set(overrideMapKey(override.itemKey, override.dateIso), override.status)
  }

  return items.map((item) => {
    let changed = false
    const days = item.timeline.days.map((day) => {
      const override = byKey.get(overrideMapKey(item.key, day.dateIso))
      if (override === undefined) return day
      changed = true
      return { ...day, status: override, overridden: true }
    })
    if (!changed) return item
    const { percent, documentedDays } = computeCompliancePercent(days)
    return {
      ...item,
      timeline: { ...item.timeline, days, percent, documentedDays },
    }
  })
}

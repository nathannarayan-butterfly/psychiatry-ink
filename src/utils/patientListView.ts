import type { DashboardCase } from '../hooks/useCaseRegistry'
import { isListedPatientCase } from '../hooks/useCaseRegistry'
import { isCaseListedOnDashboard } from '../hooks/useDemoPatient'
import { isPatientCaseArchived } from './casePatientLifecycle'

/** Sort order for the patient lists shown on the dashboard preview and the dedicated pages. */
export type PatientSort = 'recent' | 'alpha'

export interface PatientPartition {
  /** Every dashboard-listed case (active + archived), sorted most-recent first. */
  listed: DashboardCase[]
  /** Listed cases without an `archivedAt` marker. */
  active: DashboardCase[]
  /** Listed cases that have been archived. */
  archived: DashboardCase[]
}

function safeDateMs(value: string | undefined): number {
  if (!value) return 0
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : 0
}

/**
 * Partition the raw registry cases into the lists the dashboard and the dedicated
 * patient pages render. Filtering rules mirror the original dashboard logic exactly
 * (default workspace case hidden until PII entered, demo case visibility, archive
 * marker) so the preview and the full pages can never disagree on membership.
 */
export function partitionPatients(cases: DashboardCase[], userId: string): PatientPartition {
  const listed = cases
    .filter(isListedPatientCase)
    .filter((caseItem) => isCaseListedOnDashboard(caseItem.caseId, userId))
    .sort((a, b) => safeDateMs(b.lastEditedAt) - safeDateMs(a.lastEditedAt))

  const active = listed.filter((caseItem) => !isPatientCaseArchived(caseItem.caseId, userId))
  const archived = listed.filter((caseItem) => isPatientCaseArchived(caseItem.caseId, userId))

  return { listed, active, archived }
}

/** Case-insensitive name/heading match used by the dashboard search and the page search box. */
export function matchesPatientSearch(caseItem: DashboardCase, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    caseItem.displayTitle,
    caseItem.localName,
    caseItem.localVorname,
    caseItem.localNachname,
    caseItem.pageHeading,
    caseItem.documentTypeSummary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

/**
 * Stable sort for a patient list. `recent` keeps the most-recently-edited first
 * (the registry default); `alpha` sorts by display title using a locale-aware
 * comparison so accented names order correctly per UI language.
 */
export function sortPatients(
  list: DashboardCase[],
  sort: PatientSort,
  locale: string,
): DashboardCase[] {
  const next = [...list]
  if (sort === 'alpha') {
    const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
    next.sort((a, b) => collator.compare(a.displayTitle, b.displayTitle))
  } else {
    next.sort((a, b) => safeDateMs(b.lastEditedAt) - safeDateMs(a.lastEditedAt))
  }
  return next
}

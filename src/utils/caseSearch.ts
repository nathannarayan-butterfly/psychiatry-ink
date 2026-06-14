import type { DashboardCase } from '../hooks/useCaseRegistry'

/** Match patient/case registry entries by display title, local PII fields, or case id. */
export function matchesCaseSearch(caseItem: DashboardCase, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    caseItem.displayTitle,
    caseItem.localName,
    caseItem.localVorname,
    caseItem.localNachname,
    caseItem.pageHeading,
    caseItem.documentTypeSummary,
    caseItem.caseId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function formatCaseRef(caseItem: DashboardCase): string {
  const shortId = caseItem.caseId.length > 12 ? `${caseItem.caseId.slice(0, 8)}…` : caseItem.caseId
  return `${caseItem.displayTitle} · ${shortId}`
}

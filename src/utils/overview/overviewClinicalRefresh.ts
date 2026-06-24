/** Bump overview widgets that read snapshots/feeds without their own subscription. */
export const OVERVIEW_CLINICAL_REFRESH_EVENT = 'psychiatry-ink:overview-clinical-refresh'

export interface OverviewClinicalRefreshDetail {
  caseId: string
}

export function notifyOverviewClinicalRefresh(caseId: string): void {
  window.dispatchEvent(
    new CustomEvent<OverviewClinicalRefreshDetail>(OVERVIEW_CLINICAL_REFRESH_EVENT, {
      detail: { caseId },
    }),
  )
}

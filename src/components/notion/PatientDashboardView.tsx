import { useEffect } from 'react'
import { recordAuditEvent } from '../../services/auditApi'
import { CasePatientHeader } from './CasePatientHeader'
import type { TopNavTabId } from './CaseTopNav'
import type { NotionPageId } from './notionPages'
import { OverviewDashboard } from './overview/OverviewDashboard'

interface PatientDashboardViewProps {
  caseId: string
  /** Bump when local patient meta changes so the header re-reads registry data. */
  metaVersion?: number
  /** Storage-scoped case id used by the Therapie data hooks; falls back to caseId. */
  therapyCaseId?: string
  onTabSelect: (tab: TopNavTabId) => void
  onAddMedication?: () => void
  onOpenWorkspacePage?: (pageId: NotionPageId) => void
  onOpenTemplateFromPatient?: () => void
  onNavigateHome?: () => void
}

/**
 * Patient "Übersicht" — an at-a-glance clinical dashboard. The identity header
 * stays here; the bento card grid (safety, diagnoses, status, medication,
 * Spiegel, psychopathology, Verlauf, labs/monitoring, Konsile) lives in
 * {@link OverviewDashboard}, which owns all data wiring.
 */
export function PatientDashboardView({
  caseId,
  metaVersion,
  therapyCaseId,
  onTabSelect,
  onAddMedication: _onAddMedication,
  onOpenWorkspacePage,
  onOpenTemplateFromPatient: _onOpenTemplateFromPatient,
  onNavigateHome: _onNavigateHome,
}: PatientDashboardViewProps) {
  const therapyScopeId = therapyCaseId ?? caseId

  useEffect(() => {
    void recordAuditEvent('patient_identity_viewed', { caseId })
  }, [caseId])

  return (
    <div className="patient-dashboard patient-dashboard--case-sidebar">
      <div className="patient-dashboard__content">
        <CasePatientHeader caseId={caseId} metaVersion={metaVersion} />

        <div className="patient-dashboard__body">
          <main className="patient-dashboard__main">
            <OverviewDashboard
              caseId={caseId}
              therapyScopeId={therapyScopeId}
              onTabSelect={onTabSelect}
              onOpenWorkspacePage={onOpenWorkspacePage}
            />
          </main>
        </div>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { DiagnosenWidget } from '../DiagnosenWidget'
import { SpiegelwerteSection } from '../SpiegelwerteSection'
import type { TopNavTabId } from '../CaseTopNav'
import type { NotionPageId } from '../notionPages'
import { OverviewCardShell } from './OverviewCard'
import { OverviewHero } from './OverviewHero'
import { SafetyAlertsCard } from './SafetyAlertsCard'
import { MedicationOverviewCard } from './MedicationOverviewCard'
import { PriorTherapiesOverviewCard } from './PriorTherapiesOverviewCard'
import { SymptomSnapshotCard } from './SymptomSnapshotCard'
import { LaborOverviewCard } from './LaborOverviewCard'
import { RecentVerlaufCard } from './RecentVerlaufCard'
import { AppointmentsCard } from './AppointmentsCard'
import { DokumentationCard } from './DokumentationCard'
import { PsychotherapyWidgetCard } from './PsychotherapyWidgetCard'
import { IsdmSummaryWidget } from './IsdmSummaryWidget'
import { CollaborationCard } from './CollaborationCard'
import { RecentLabResultsCard } from './RecentLabResultsCard'
import { ButterflyCriteriaCard } from './ButterflyCriteriaCard'
import { ZwangsmassnahmeCard } from './ZwangsmassnahmeCard'
import { VerlaufstendenzCard } from './VerlaufstendenzCard'
import { DiagnosticSummaryCard } from './DiagnosticSummaryCard'
import { RegisteredTherapiesCard } from './RegisteredTherapiesCard'
import { ComplianceOverviewCard } from './ComplianceOverviewCard'
import { DimensionalProfileWidget } from './widgets/DimensionalProfileWidget'
import { MechanismHypothesesWidget } from './widgets/MechanismHypothesesWidget'
import { ClinicalIntelligenceStatusWidget } from './widgets/ClinicalIntelligenceStatusWidget'
import type {
  HeroSummaryData,
  MedicationOverviewData,
  SymptomSnapshotData,
  SafetyData,
  LaborOverviewData,
  RecentVerlaufItem,
  KonsileTasksData,
} from './types'
import type { OverviewWidgetId } from '../../../utils/overview/overviewLayout'
import type { MedicationEntry } from '../../../types/medicationPlan'
import type { CalendarItem } from '../../../types/calendar'
import type { DokumentationSummaryData } from '../../../utils/overview/dokumentationSummary'
import type { PsychotherapySummary } from '../../../types/psychotherapy'
import type { IsdmClinicalAnalysis } from '../../../types/isdm'
import type { RecentLabResultItem } from '../../../utils/overview/recentLabResults'
import type { ButterflySummaryItem } from '../../../utils/overview/butterflySummary'
import type { DiagnosticExamSummary } from '../../../utils/overview/diagnosticSummaries'
import type { ZwangsmassnahmeSummary } from '../../../utils/overview/zwangsmassnahmeSummary'
import type { VerlaufstendenzSummary } from '../../../utils/overview/verlaufstendenzSummary'
import type { RegisteredTherapiesSummary } from '../../../utils/overview/registeredTherapiesSummary'
import type { ComplianceSummaryData } from '../../../utils/overview/complianceSummary'

export interface OverviewWidgetRenderContext {
  caseId: string
  heroData: HeroSummaryData
  safetyData: SafetyData
  medicationData: MedicationOverviewData
  symptomData: SymptomSnapshotData
  laborData: LaborOverviewData
  medications: MedicationEntry[]
  recentVerlauf: RecentVerlaufItem[]
  appointments: { upcoming: CalendarItem[]; loading: boolean }
  dokumentation: DokumentationSummaryData
  psychotherapy: { summary: PsychotherapySummary; hasPlan: boolean }
  isdmAnalysis: IsdmClinicalAnalysis | null
  collaboration: KonsileTasksData
  recentLabResults: RecentLabResultItem[]
  butterflySummary: ButterflySummaryItem[]
  zwangsmassnahme: ZwangsmassnahmeSummary
  verlaufstendenz: VerlaufstendenzSummary
  ekgSummary: DiagnosticExamSummary
  eegSummary: DiagnosticExamSummary
  ctSummary: DiagnosticExamSummary
  registeredTherapies: RegisteredTherapiesSummary
  compliance: ComplianceSummaryData
  psychopathFindingRevision?: number
  onTabSelect: (tab: TopNavTabId) => void
  onOpenWorkspacePage?: (pageId: NotionPageId) => void
}

export function renderOverviewWidget(
  widgetId: OverviewWidgetId,
  ctx: OverviewWidgetRenderContext,
): ReactNode {
  switch (widgetId) {
    case 'hero-summary':
      return <OverviewHero data={ctx.heroData} caseId={ctx.caseId} />
    case 'safety':
      return <SafetyAlertsCard data={ctx.safetyData} />
    case 'medication':
      return (
        <MedicationOverviewCard
          data={ctx.medicationData}
          caseId={ctx.caseId}
          onOpenMedikation={() => ctx.onTabSelect('medikation')}
        />
      )
    case 'diagnoses':
      return (
        <OverviewCardShell>
          <DiagnosenWidget caseId={ctx.caseId} variant="panel" />
        </OverviewCardShell>
      )
    case 'psychopathology':
      return (
        <SymptomSnapshotCard
          caseId={ctx.caseId}
          data={ctx.symptomData}
          onOpen={ctx.onOpenWorkspacePage ? () => ctx.onOpenWorkspacePage!('psychopath') : undefined}
        />
      )
    case 'labs-due':
      return (
        <LaborOverviewCard
          data={ctx.laborData}
          onOpenLabor={() => ctx.onTabSelect('labor')}
          ekg={ctx.ekgSummary}
          eeg={ctx.eegSummary}
          imaging={ctx.ctSummary}
        />
      )
    case 'prior-therapies':
      return (
        <PriorTherapiesOverviewCard
          caseId={ctx.caseId}
          medications={ctx.medications}
          onOpenMedikation={() => ctx.onTabSelect('medikation')}
        />
      )
    case 'spiegel-all':
      return (
        <OverviewCardShell>
          <SpiegelwerteSection caseId={ctx.caseId} />
        </OverviewCardShell>
      )
    case 'recent-verlauf':
      return (
        <RecentVerlaufCard
          items={ctx.recentVerlauf}
          onOpenVerlauf={() => ctx.onTabSelect('verlauf')}
        />
      )
    case 'appointments':
      return (
        <AppointmentsCard upcoming={ctx.appointments.upcoming} loading={ctx.appointments.loading} />
      )
    case 'dokumentation':
      return (
        <DokumentationCard
          data={ctx.dokumentation}
          onOpenDokumente={() => ctx.onTabSelect('dokumente')}
        />
      )
    case 'psychotherapy':
      return (
        <PsychotherapyWidgetCard
          summary={ctx.psychotherapy.summary}
          hasPlan={ctx.psychotherapy.hasPlan}
          onOpenTherapie={() => ctx.onTabSelect('therapie')}
        />
      )
    case 'isdm-summary':
      return (
        <IsdmSummaryWidget
          analysis={ctx.isdmAnalysis}
          onOpenDiagnose={() => ctx.onTabSelect('diagnose')}
        />
      )
    case 'collaboration':
      return (
        <CollaborationCard
          data={ctx.collaboration}
          onOpenDiscuss={() => ctx.onTabSelect('discuss')}
          onOpenKonsil={() => ctx.onTabSelect('konsil')}
        />
      )
    case 'lab-results':
      return (
        <RecentLabResultsCard
          items={ctx.recentLabResults}
          onOpenLabor={() => ctx.onTabSelect('labor')}
        />
      )
    case 'butterfly-criteria':
      return (
        <ButterflyCriteriaCard
          items={ctx.butterflySummary}
          onOpenDiagnose={() => ctx.onTabSelect('diagnose')}
        />
      )
    case 'zwangsmassnahme':
      return <ZwangsmassnahmeCard data={ctx.zwangsmassnahme} />
    case 'verlaufstendenz':
      return <VerlaufstendenzCard caseId={ctx.caseId} data={ctx.verlaufstendenz} />
    case 'ekg-summary':
      return (
        <DiagnosticSummaryCard
          title="Letztes EKG"
          data={ctx.ekgSummary}
          onOpen={() => ctx.onTabSelect('labor')}
          actionLabel="Zu Diagnostik"
        />
      )
    case 'eeg-summary':
      return (
        <DiagnosticSummaryCard
          title="EEG"
          data={ctx.eegSummary}
          onOpen={() => ctx.onTabSelect('labor')}
          actionLabel="Zu Diagnostik"
        />
      )
    case 'ct-summary':
      return (
        <DiagnosticSummaryCard
          title="Letztes CT"
          data={ctx.ctSummary}
        />
      )
    case 'angemeldete-therapien':
      return (
        <RegisteredTherapiesCard
          data={ctx.registeredTherapies}
          onOpenTherapie={() => ctx.onTabSelect('therapie')}
        />
      )
    case 'compliance':
      return <ComplianceOverviewCard data={ctx.compliance} caseId={ctx.caseId} />
    case 'ci-dimensional':
      return (
        <DimensionalProfileWidget
          caseId={ctx.caseId}
          onOpenSection={() => ctx.onTabSelect('ci')}
        />
      )
    case 'ci-mechanism':
      return (
        <MechanismHypothesesWidget
          caseId={ctx.caseId}
          onOpenSection={() => ctx.onTabSelect('ci')}
        />
      )
    case 'ci-status':
      return (
        <ClinicalIntelligenceStatusWidget
          caseId={ctx.caseId}
          onOpenSection={() => ctx.onTabSelect('ci')}
        />
      )
    default:
      return null
  }
}

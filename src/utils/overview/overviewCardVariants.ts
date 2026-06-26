import type { OverviewWidgetId } from './overviewLayout'

/** Visual card family for the Übersicht bento grid — subtle surface/border differentiation. */
export type OverviewCardVariant =
  | 'patient-summary'
  | 'clinical-data'
  | 'medication'
  | 'safety'
  | 'ai-hypothesis'
  | 'course-trend'

export const OVERVIEW_WIDGET_CARD_VARIANT: Partial<Record<OverviewWidgetId, OverviewCardVariant>> = {
  'hero-summary': 'patient-summary',
  safety: 'safety',
  zwangsmassnahme: 'safety',
  medication: 'medication',
  'prior-therapies': 'medication',
  'spiegel-all': 'medication',
  'receptor-profile': 'medication',
  diagnoses: 'clinical-data',
  'labs-due': 'clinical-data',
  'lab-results': 'clinical-data',
  'ekg-summary': 'clinical-data',
  'eeg-summary': 'clinical-data',
  'ct-summary': 'clinical-data',
  'isdm-summary': 'clinical-data',
  appointments: 'clinical-data',
  dokumentation: 'clinical-data',
  psychotherapy: 'clinical-data',
  collaboration: 'clinical-data',
  'angemeldete-therapien': 'clinical-data',
  compliance: 'clinical-data',
  'butterfly-criteria': 'ai-hypothesis',
  'ci-dimensional': 'ai-hypothesis',
  'ci-mechanism': 'ai-hypothesis',
  'ci-status': 'ai-hypothesis',
  verlaufstendenz: 'course-trend',
  'recent-verlauf': 'course-trend',
  psychopathology: 'course-trend',
}

export function getOverviewCardVariant(widgetId: OverviewWidgetId): OverviewCardVariant | null {
  return OVERVIEW_WIDGET_CARD_VARIANT[widgetId] ?? null
}

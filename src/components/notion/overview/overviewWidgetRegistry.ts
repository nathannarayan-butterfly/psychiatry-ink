import type { UiTranslationKey } from '../../../data/uiTranslations'
import type {
  OverviewWidgetId,
  OverviewWidgetVisibility,
  OverviewWidgetWidth,
} from '../../../utils/overview/overviewLayout'

export interface OverviewWidgetDefinition {
  id: OverviewWidgetId
  titleKey: UiTranslationKey
  descriptionKey: UiTranslationKey
  defaultWidth: OverviewWidgetWidth
  /** Widget can only appear once in the layout. */
  singleton: boolean
  visibility: OverviewWidgetVisibility
}

export const OVERVIEW_WIDGET_REGISTRY: Record<OverviewWidgetId, OverviewWidgetDefinition> = {
  'hero-summary': {
    id: 'hero-summary',
    titleKey: 'overviewWidgetHeroSummary',
    descriptionKey: 'overviewWidgetDescHeroSummary',
    defaultWidth: 'full',
    singleton: true,
    visibility: 'always',
  },
  safety: {
    id: 'safety',
    titleKey: 'overviewWidgetSafety',
    descriptionKey: 'overviewWidgetDescSafety',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'always',
  },
  medication: {
    id: 'medication',
    titleKey: 'overviewWidgetMedication',
    descriptionKey: 'overviewWidgetDescMedication',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'always',
  },
  'spiegel-latest': {
    id: 'spiegel-latest',
    titleKey: 'overviewWidgetSpiegelLatest',
    descriptionKey: 'overviewWidgetDescSpiegelLatest',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'hasSpiegel',
  },
  diagnoses: {
    id: 'diagnoses',
    titleKey: 'overviewWidgetDiagnoses',
    descriptionKey: 'overviewWidgetDescDiagnoses',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'always',
  },
  psychopathology: {
    id: 'psychopathology',
    titleKey: 'overviewWidgetPsychopathology',
    descriptionKey: 'overviewWidgetDescPsychopathology',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'always',
  },
  'labs-due': {
    id: 'labs-due',
    titleKey: 'overviewWidgetLabsDue',
    descriptionKey: 'overviewWidgetDescLabsDue',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'always',
  },
  'prior-therapies': {
    id: 'prior-therapies',
    titleKey: 'overviewWidgetPriorTherapies',
    descriptionKey: 'overviewWidgetDescPriorTherapies',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'always',
  },
  'spiegel-all': {
    id: 'spiegel-all',
    titleKey: 'overviewWidgetSpiegelAll',
    descriptionKey: 'overviewWidgetDescSpiegelAll',
    defaultWidth: 'full',
    singleton: true,
    visibility: 'hasAdditionalSpiegel',
  },
  'recent-verlauf': {
    id: 'recent-verlauf',
    titleKey: 'overviewWidgetRecentVerlauf',
    descriptionKey: 'overviewWidgetDescRecentVerlauf',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'always',
  },
  appointments: {
    id: 'appointments',
    titleKey: 'overviewWidgetAppointments',
    descriptionKey: 'overviewWidgetDescAppointments',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'always',
  },
  dokumentation: {
    id: 'dokumentation',
    titleKey: 'overviewWidgetDokumentation',
    descriptionKey: 'overviewWidgetDescDokumentation',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'always',
  },
  psychotherapy: {
    id: 'psychotherapy',
    titleKey: 'overviewWidgetPsychotherapy',
    descriptionKey: 'overviewWidgetDescPsychotherapy',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'hasPsychotherapy',
  },
  'isdm-summary': {
    id: 'isdm-summary',
    titleKey: 'overviewWidgetIsdmSummary',
    descriptionKey: 'overviewWidgetDescIsdmSummary',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'hasIsdm',
  },
  collaboration: {
    id: 'collaboration',
    titleKey: 'overviewWidgetCollaboration',
    descriptionKey: 'overviewWidgetDescCollaboration',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'always',
  },
  'lab-results': {
    id: 'lab-results',
    titleKey: 'overviewWidgetLabResults',
    descriptionKey: 'overviewWidgetDescLabResults',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'hasLabData',
  },
  'butterfly-criteria': {
    id: 'butterfly-criteria',
    titleKey: 'overviewWidgetButterflyCriteria',
    descriptionKey: 'overviewWidgetDescButterflyCriteria',
    defaultWidth: 'half',
    singleton: true,
    visibility: 'hasButterfly',
  },
}

export const OVERVIEW_WIDGET_LIST = Object.values(OVERVIEW_WIDGET_REGISTRY)

import {
  Activity,
  Brain,
  ClipboardList,
  FileText,
  FlaskConical,
  GitBranch,
  HeartHandshake,
  HeartPulse,
  LineChart,
  MessagesSquare,
  Pill,
  ScrollText,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'
import type { TopNavTabId } from '../../components/notion/CaseTopNav'
import type { NotionPageId } from '../../components/notion/notionPages'
import type { UiTranslationKey } from '../uiTranslations'

/**
 * Workspace Launcher — task registry.
 *
 * Every task card and creation mode maps to a REAL, navigable destination that
 * the workspace system already supports — the same set the right-click
 * `WorkspaceContextMenu` exposes (document pages + tool pages from
 * `NOTION_PAGES`, their variants / subsections, the clinical-area actions, the
 * Formulare/Vorlagen template host) plus the real top-nav tabs. No invented
 * modules or templates.
 *
 * The launcher never forks routing: it emits a {@link LauncherTarget} descriptor
 * that `NotionApp` interprets with its existing handlers (`handlePageSelect`,
 * `handlePageSelectWithSection`, `selectDocumentType`, `setActiveTopTab`,
 * `openTemplateHost`, `openAnforderungModal`).
 *
 * Where a requested wording has no dedicated backing flow yet, the mode routes
 * to the module's closest real entry and is flagged `fallback: true` so
 * Developer Mode can surface that it is a default-create fallback.
 */

/** Coarse grouping used for ordering / Developer-mode badges. */
export type LauncherCategory =
  | 'documentation'
  | 'findings'
  | 'medication'
  | 'diagnostics'
  | 'therapy'
  | 'communication'
  | 'forms'

/**
 * Navigation intent emitted when a task + creation mode is launched. Interpreted
 * centrally by `NotionApp` so the launcher reuses the existing workspace router.
 */
export type LauncherTarget =
  | {
      kind: 'workspacePage'
      pageId: NotionPageId
      /** Document-type variant id (e.g. `sections` / `free` / `broad` / `checklist`). */
      variantId?: string
      /** Subsection id for pages that open a specific section (therapieplanung / befundung). */
      sectionId?: string
      /** Start voice dictation immediately after the page opens. */
      dictation?: boolean
    }
  | {
      kind: 'topTab'
      tab: TopNavTabId
      /** Auto-open the "add medication" dialog (medikation tab only). */
      medicationAdd?: boolean
    }
  /** Open the document-template host (Formulare / Vorlagen picker). */
  | { kind: 'template' }
  /** Open the Anforderung (clinical request) modal. */
  | { kind: 'anforderung' }
  /**
   * Run a workspace AI feature that produces an editable result in place
   * (credit-guarded server generation), rather than navigating anywhere.
   * `lab-interpretation` interprets the case's lab values (Item 10);
   * `aufklaerung` generates a patient education / consent text (Item 11).
   */
  | { kind: 'aiFeature'; feature: 'lab-interpretation' | 'aufklaerung' }

/** A single "how do you want to create it?" option shown in the follow-up step. */
export interface LauncherCreationMode {
  id: string
  labelKey: UiTranslationKey
  /** Extra fuzzy-search terms (DE + EN), lower-case. Matched in addition to the label. */
  keywords?: string[]
  target: LauncherTarget
  /**
   * `true` when this mode routes to the module's default/closest entry rather
   * than a dedicated flow for that exact wording. Surfaced in Developer Mode.
   */
  fallback?: boolean
  /** Restrict visibility to a UI language (e.g. the English Discharge Summary). */
  languageOnly?: 'en'
}

export interface LauncherTask {
  id: string
  labelKey: UiTranslationKey
  descKey: UiTranslationKey
  category: LauncherCategory
  icon: LucideIcon
  /** Extra fuzzy-search terms (DE + EN), lower-case. Matched in addition to the label. */
  keywords: string[]
  modes: LauncherCreationMode[]
}

export const LAUNCHER_TASKS: LauncherTask[] = [
  {
    id: 'anamnese',
    labelKey: 'launcherTaskAnamnese',
    descKey: 'launcherTaskAnamneseDesc',
    category: 'documentation',
    icon: ClipboardList,
    keywords: [
      'anamnese',
      'aufnahme',
      'admission',
      'history',
      'intake',
      'erstgespräch',
      'aufnahmebefund',
    ],
    modes: [
      {
        id: 'sections',
        labelKey: 'launcherModeAnamneseSections',
        keywords: ['abschnitte', 'structured', 'strukturiert', 'sections'],
        target: { kind: 'workspacePage', pageId: 'aufnahme', variantId: 'sections' },
      },
      {
        id: 'free',
        labelKey: 'launcherModeAnamneseFree',
        keywords: ['freitext', 'free text'],
        target: { kind: 'workspacePage', pageId: 'aufnahme', variantId: 'free' },
      },
      {
        id: 'dictation',
        labelKey: 'launcherModeDictation',
        keywords: ['diktat', 'dictation', 'voice'],
        target: { kind: 'workspacePage', pageId: 'aufnahme', variantId: 'free', dictation: true },
      },
    ],
  },
  {
    id: 'verlauf',
    labelKey: 'launcherTaskVerlauf',
    descKey: 'launcherTaskVerlaufDesc',
    category: 'documentation',
    icon: Activity,
    keywords: [
      'verlauf',
      'progress note',
      'course',
      'verlaufseintrag',
      'notiz',
      'progress',
      'follow-up note',
      'verlauf dokumentieren',
      'verlauf documentieren',
      'verlauf eintragen',
    ],
    modes: [
      {
        id: 'short',
        labelKey: 'launcherModeVerlaufShort',
        keywords: ['kurznotiz', 'short note'],
        target: { kind: 'workspacePage', pageId: 'verlauf', variantId: 'short' },
      },
      {
        id: 'broad',
        labelKey: 'launcherModeVerlaufBroad',
        keywords: ['breiter verlauf', 'broad', 'structured course'],
        target: { kind: 'workspacePage', pageId: 'verlauf', variantId: 'broad' },
      },
      {
        id: 'therapie-verlauf',
        labelKey: 'launcherModeTherapieVerlauf',
        keywords: ['therapieverlauf', 'therapy course', 'therapie und verlauf'],
        target: { kind: 'workspacePage', pageId: 'therapie-verlauf' },
      },
      {
        id: 'dictation',
        labelKey: 'launcherModeDictation',
        keywords: ['diktat', 'dictation', 'voice', 'sprechen'],
        target: { kind: 'workspacePage', pageId: 'verlauf', variantId: 'short', dictation: true },
      },
    ],
  },
  {
    id: 'psychopath',
    labelKey: 'launcherTaskPsychopath',
    descKey: 'launcherTaskPsychopathDesc',
    category: 'findings',
    icon: Brain,
    keywords: [
      'psychopathologischer befund',
      'psychopathologie',
      'psychopathology',
      'ppb',
      'amdp',
      'befund',
      'mental state examination',
      'mse',
    ],
    modes: [
      {
        id: 'free',
        labelKey: 'launcherModePsychopathFree',
        keywords: ['freitext', 'free text'],
        target: { kind: 'workspacePage', pageId: 'psychopath', variantId: 'free' },
      },
      {
        id: 'checklist',
        labelKey: 'launcherModePsychopathAmdp',
        keywords: ['amdp', 'checklist', 'guided', 'strukturiert'],
        target: { kind: 'workspacePage', pageId: 'psychopath', variantId: 'checklist' },
      },
      {
        id: 'isdm',
        labelKey: 'launcherModePsychopathIsdm',
        keywords: ['isdm', 'structured', 'international'],
        target: { kind: 'workspacePage', pageId: 'psychopath', variantId: 'isdm' },
      },
      {
        id: 'dictation',
        labelKey: 'launcherModeDictation',
        keywords: ['diktat', 'dictation', 'voice'],
        target: { kind: 'workspacePage', pageId: 'psychopath', variantId: 'free', dictation: true },
      },
    ],
  },
  {
    id: 'medikation',
    labelKey: 'launcherTaskMedikation',
    descKey: 'launcherTaskMedikationDesc',
    category: 'medication',
    icon: Pill,
    keywords: [
      'medikation',
      'medication',
      'medikamente',
      'arzneimittel',
      'drugs',
      'verordnung',
      'prescription',
      'pharmakotherapie',
    ],
    modes: [
      {
        id: 'open-plan',
        labelKey: 'launcherModeMedikationPlan',
        keywords: ['medikationsplan', 'medication plan'],
        target: { kind: 'topTab', tab: 'medikation' },
      },
      {
        id: 'add-med',
        labelKey: 'launcherModeMedikationAdd',
        keywords: ['medikament hinzufügen', 'add medication', 'neues medikament'],
        target: { kind: 'topTab', tab: 'medikation', medicationAdd: true },
      },
    ],
  },
  {
    id: 'labor',
    labelKey: 'launcherTaskLabor',
    descKey: 'launcherTaskLaborDesc',
    category: 'diagnostics',
    icon: FlaskConical,
    keywords: [
      'labor',
      'lab',
      'laborwerte',
      'blood',
      'blut',
      'diagnostik',
      'diagnostics',
      'spiegel',
      'levels',
    ],
    modes: [
      {
        id: 'interpret',
        labelKey: 'launcherModeLaborInterpret',
        keywords: ['interpretieren', 'interpretation', 'ki', 'ai', 'auswerten', 'befund deuten'],
        target: { kind: 'aiFeature', feature: 'lab-interpretation' },
      },
      {
        id: 'open',
        labelKey: 'launcherModeLaborOpen',
        keywords: ['laborwerte', 'lab values'],
        target: { kind: 'topTab', tab: 'labor' },
      },
      {
        id: 'workspace-diagnostik',
        labelKey: 'launcherModeLaborDiagnostik',
        keywords: ['diagnostik', 'workspace', 'arbeitsbereich'],
        target: { kind: 'workspacePage', pageId: 'labor' },
      },
      {
        id: 'anforderung',
        labelKey: 'launcherModeLaborAnforderung',
        keywords: ['anforderung', 'request', 'befund anfordern', 'order'],
        // Requires a linked patient; falls back to the Labor tab when unavailable.
        fallback: true,
        target: { kind: 'anforderung' },
      },
    ],
  },
  {
    id: 'befundung',
    labelKey: 'launcherTaskBefundung',
    descKey: 'launcherTaskBefundungDesc',
    category: 'diagnostics',
    icon: HeartPulse,
    keywords: [
      'befundung',
      'ekg',
      'ecg',
      'eeg',
      'kardiogramm',
      'electrocardiogram',
      'electroencephalogram',
      'apparative diagnostik',
    ],
    modes: [
      {
        id: 'ekg',
        labelKey: 'launcherModeBefundungEkg',
        keywords: ['ekg', 'ecg', 'kardiogramm', 'qtc'],
        target: { kind: 'workspacePage', pageId: 'befundung', sectionId: 'befund-ecg' },
      },
      {
        id: 'eeg',
        labelKey: 'launcherModeBefundungEeg',
        keywords: ['eeg', 'electroencephalogram', 'hirnstrom'],
        target: { kind: 'workspacePage', pageId: 'befundung', sectionId: 'befund-eeg' },
      },
    ],
  },
  {
    id: 'visualisation',
    labelKey: 'launcherTaskVisualisation',
    descKey: 'launcherTaskVisualisationDesc',
    category: 'diagnostics',
    icon: LineChart,
    keywords: [
      'visualisierung',
      'visualisation',
      'visualization',
      'grafik',
      'graph',
      'chart',
      'verlaufskurve',
      'trend',
    ],
    modes: [
      {
        id: 'open',
        labelKey: 'launcherModeOpen',
        target: { kind: 'workspacePage', pageId: 'visualisation' },
      },
    ],
  },
  {
    id: 'timeline',
    labelKey: 'launcherTaskTimeline',
    descKey: 'launcherTaskTimelineDesc',
    category: 'documentation',
    icon: GitBranch,
    keywords: [
      'timeline',
      'zeitachse',
      'zeitstrahl',
      'verlaufszeitachse',
      'chronik',
      'chronology',
      'history line',
    ],
    modes: [
      {
        id: 'open',
        labelKey: 'launcherModeOpen',
        target: { kind: 'workspacePage', pageId: 'timeline' },
      },
    ],
  },
  {
    id: 'therapieplanung',
    labelKey: 'launcherTaskTherapieplanung',
    descKey: 'launcherTaskTherapieplanungDesc',
    category: 'therapy',
    icon: HeartHandshake,
    keywords: [
      'therapieplanung',
      'therapy planning',
      'psychotherapie',
      'psychotherapy',
      'soziotherapie',
      'komplementär',
      'behandlungsplan',
      'treatment plan',
    ],
    modes: [
      {
        id: 'psychotherapie',
        labelKey: 'launcherModeTherapiePsychotherapie',
        keywords: ['psychotherapie', 'psychotherapy'],
        target: { kind: 'workspacePage', pageId: 'therapieplanung', sectionId: 'therapy-psychotherapie' },
      },
      {
        id: 'komplementaer',
        labelKey: 'launcherModeTherapieKomplementaer',
        keywords: ['komplementär', 'complementary'],
        target: { kind: 'workspacePage', pageId: 'therapieplanung', sectionId: 'therapy-komplementaer' },
      },
      {
        id: 'sozial',
        labelKey: 'launcherModeTherapieSozial',
        keywords: ['soziotherapie', 'social therapy'],
        target: { kind: 'workspacePage', pageId: 'therapieplanung', sectionId: 'therapy-sozial' },
      },
      {
        id: 'weitere',
        labelKey: 'launcherModeTherapieWeitere',
        keywords: ['weitere therapie', 'further therapy'],
        target: { kind: 'workspacePage', pageId: 'therapieplanung', sectionId: 'therapy-weitere' },
      },
    ],
  },
  {
    id: 'diagnose',
    labelKey: 'launcherTaskDiagnose',
    descKey: 'launcherTaskDiagnoseDesc',
    category: 'findings',
    icon: Stethoscope,
    keywords: [
      'diagnose',
      'diagnosis',
      'icd',
      'kodierung',
      'coding',
      'diagnosen',
      'comorbidity',
      'komorbidität',
    ],
    modes: [
      {
        id: 'open',
        labelKey: 'launcherModeOpen',
        target: { kind: 'topTab', tab: 'diagnose' },
      },
    ],
  },
  {
    id: 'arztbrief',
    labelKey: 'launcherTaskArztbrief',
    descKey: 'launcherTaskArztbriefDesc',
    category: 'communication',
    icon: ScrollText,
    keywords: [
      'arztbrief',
      'physician letter',
      'brief',
      'epikrise',
      'entlassbrief',
      'discharge letter',
      'doctor letter',
    ],
    modes: [
      {
        id: 'new',
        labelKey: 'launcherModeArztbriefNew',
        target: { kind: 'workspacePage', pageId: 'arztbrief' },
      },
      {
        id: 'discharge-summary',
        labelKey: 'launcherModeDischargeSummary',
        keywords: ['discharge summary', 'entlassbrief'],
        languageOnly: 'en',
        target: { kind: 'workspacePage', pageId: 'discharge-summary' },
      },
    ],
  },
  {
    id: 'patientenaufklaerung',
    labelKey: 'launcherTaskAufklaerung',
    descKey: 'launcherTaskAufklaerungDesc',
    category: 'communication',
    icon: HeartHandshake,
    keywords: [
      'patientenaufklärung',
      'aufklärung',
      'informed consent',
      'consent',
      'psychoedukation',
      'patient education',
      'medikationsaufklärung',
      'education',
    ],
    modes: [
      {
        id: 'generate',
        labelKey: 'launcherModeAufklaerungGenerate',
        keywords: ['erstellen', 'generieren', 'ki', 'ai', 'aufklärungstext', 'patientenaufklärung'],
        target: { kind: 'aiFeature', feature: 'aufklaerung' },
      },
      {
        id: 'medication-education',
        labelKey: 'launcherModeAufklaerungMedication',
        keywords: ['medikationsaufklärung', 'medication education', 'psychoedukation'],
        // The medication patient-education workspace opens from the medication
        // list, so this routes to the Medikation tab (closest real entry).
        fallback: true,
        target: { kind: 'topTab', tab: 'medikation' },
      },
      {
        id: 'form',
        labelKey: 'launcherModeAufklaerungForm',
        keywords: ['aufklärungsbogen', 'consent form', 'vorlage', 'formular'],
        target: { kind: 'template' },
      },
    ],
  },
  {
    id: 'formulare',
    labelKey: 'launcherTaskFormulare',
    descKey: 'launcherTaskFormulareDesc',
    category: 'forms',
    icon: FileText,
    keywords: [
      'formular',
      'form',
      'vorlage',
      'template',
      'dokumentvorlage',
      'bogen',
      'antrag',
      'attest',
    ],
    modes: [
      {
        id: 'open',
        labelKey: 'launcherModeOpen',
        target: { kind: 'template' },
      },
    ],
  },
  {
    id: 'discuss',
    labelKey: 'launcherTaskDiscuss',
    descKey: 'launcherTaskDiscussDesc',
    category: 'communication',
    icon: MessagesSquare,
    keywords: [
      'fall besprechen',
      'discuss case',
      'diskussion',
      'konsil',
      'consultation',
      'second opinion',
      'besprechung',
      'case discussion',
    ],
    modes: [
      {
        id: 'discuss',
        labelKey: 'launcherModeDiscussStart',
        keywords: ['falldiskussion', 'discuss'],
        target: { kind: 'topTab', tab: 'discuss' },
      },
      {
        id: 'konsil',
        labelKey: 'launcherModeDiscussKonsil',
        keywords: ['konsil', 'consultation request'],
        target: { kind: 'topTab', tab: 'konsil' },
      },
    ],
  },
  {
    id: 'anforderungen',
    labelKey: 'launcherTaskAnforderungen',
    descKey: 'launcherTaskAnforderungenDesc',
    category: 'diagnostics',
    icon: ClipboardList,
    keywords: [
      'anforderung',
      'anforderungen',
      'requisition',
      'requisitions',
      'request',
      'order',
      'befund anfordern',
      'labor anfordern',
      'untersuchung anfordern',
    ],
    modes: [
      {
        id: 'open',
        labelKey: 'launcherModeOpen',
        // Opens the requisition modal; requires a linked patient, otherwise the
        // launch handler falls back to the Labor tool (see handleLauncherLaunch).
        fallback: true,
        target: { kind: 'anforderung' },
      },
    ],
  },
  {
    id: 'konsil',
    labelKey: 'launcherTaskKonsil',
    descKey: 'launcherTaskKonsilDesc',
    category: 'communication',
    icon: Stethoscope,
    keywords: [
      'konsil',
      'konsiliar',
      'consult',
      'consultation',
      'second opinion',
      'mitbeurteilung',
      'überweisung',
    ],
    modes: [
      {
        id: 'open',
        labelKey: 'launcherModeOpen',
        target: { kind: 'topTab', tab: 'konsil' },
      },
    ],
  },
]

export function getLauncherTask(id: string): LauncherTask | undefined {
  return LAUNCHER_TASKS.find((task) => task.id === id)
}

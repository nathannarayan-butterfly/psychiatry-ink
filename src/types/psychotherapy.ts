/**
 * Psychotherapy planning & documentation — Layer 2c profile inside Clinical Analysis.
 *
 * Two shapes:
 *  - `PsychotherapySummary`: compact, derived view read by the Therapie module card.
 *  - `PsychotherapyPlan`: full plan stored in the encrypted workspace vault.
 *
 * Each SessionNote produces (1) a readable clinical paragraph for Verlauf/Arztbrief
 * and (2) structured metadata that feeds the Clinical Imprint layer (see
 * `utils/psychotherapy/imprint.ts`). This module is documentation- and
 * planning-oriented — it never performs AI diagnosis. Structured fields only prepare
 * later longitudinal treatment-response analysis.
 */

export const PSYCHOTHERAPY_PLAN_VERSION = 1

export type PsychotherapyStatus = 'active' | 'paused' | 'completed' | 'not-started'

export type GoalStatus = 'open' | 'in-progress' | 'achieved' | 'deferred'

export type ProgressStatus = 'on-track' | 'slow' | 'stalled' | 'improving'

export type StageStatus = 'planned' | 'active' | 'done' | 'skipped'

export type SessionSetting = 'individual' | 'group' | 'family' | 'crisis' | 'phone' | 'video' | 'other'

export type PlannedSessionStatus = 'planned' | 'completed' | 'cancelled' | 'moved'

/** Canonical stage identifiers (phase-based planning). */
export type TherapyStageId =
  | 'stabilization'
  | 'psychoeducation'
  | 'symptom-coping'
  | 'adherence'
  | 'relapse-prevention'
  | 'social-reintegration'
  | 'discharge-preparation'
  | 'forensic-risk-work'

export const THERAPY_STAGE_IDS: TherapyStageId[] = [
  'stabilization',
  'psychoeducation',
  'symptom-coping',
  'adherence',
  'relapse-prevention',
  'social-reintegration',
  'discharge-preparation',
  'forensic-risk-work',
]

/** Canonical method identifiers (interventions). */
export type TherapyMethodId =
  | 'supportive'
  | 'psychoeducation'
  | 'cbt'
  | 'motivational-interviewing'
  | 'addiction-focused'
  | 'skills-training'
  | 'crisis-intervention'
  | 'relapse-prevention'
  | 'social-skills'
  | 'family-work'
  | 'forensic-offense-work'

export const THERAPY_METHOD_IDS: TherapyMethodId[] = [
  'supportive',
  'psychoeducation',
  'cbt',
  'motivational-interviewing',
  'addiction-focused',
  'skills-training',
  'crisis-intervention',
  'relapse-prevention',
  'social-skills',
  'family-work',
  'forensic-offense-work',
]

export const SESSION_SETTINGS: SessionSetting[] = [
  'individual',
  'group',
  'family',
  'crisis',
  'phone',
  'video',
  'other',
]

export interface Goal {
  id: string
  text: string
  status?: GoalStatus
}

export interface TherapyStage {
  id: string
  stageId: TherapyStageId
  status: StageStatus
  notes?: string
  /** Display order within the plan. */
  order: number
}

export interface TherapyMethod {
  id: string
  methodId: TherapyMethodId
  selected: boolean
  notes?: string
}

export interface PlannedSession {
  id: string
  topic: string
  goal: string
  intervention: string
  homework: string
  date: string
  status: PlannedSessionStatus
}

/**
 * Structured metadata that a session note contributes to the Clinical Imprint layer.
 * Mirrors the readableClinicalSentence + structured-fields pattern used by medication.
 */
export interface SessionClinicalImprintMeta {
  readableClinicalSentence: string
  topic: string
  intervention: string
  progress: string
  riskAspects: string
  nextFocus: string
}

export interface SessionNote {
  id: string
  date: string
  setting: SessionSetting
  duration: string
  topic: string
  intervention: string
  patientReaction: string
  progress: string
  riskAspects: string
  nextFocus: string
  /** Readable clinical paragraph composed from the structured fields (rule-based). */
  generatedParagraph: string
  /** Structured metadata pushed into the Clinical Imprint layer. */
  clinicalImprintMeta?: SessionClinicalImprintMeta
  createdAt: string
}

export interface PsychotherapyOverview {
  status: PsychotherapyStatus
  therapist?: string
  setting?: string
  frequency?: string
  plannedDuration?: string
  startDate?: string
  reviewDate?: string
}

export interface PsychotherapyReview {
  progress?: string
  barriers?: string
  planAdjustment?: string
  dischargeSummaryPrep?: string
}

export interface PsychotherapyGoals {
  shortTerm: Goal[]
  mediumTerm: Goal[]
  longTerm: Goal[]
}

/** Full psychotherapy plan — stored in encrypted case data. */
export interface PsychotherapyPlan {
  version: number
  updatedAt: string
  overview: PsychotherapyOverview
  indication?: string
  clinicalRationale?: string
  goals: PsychotherapyGoals
  stages: TherapyStage[]
  methods: TherapyMethod[]
  plannedSessions: PlannedSession[]
  sessions: SessionNote[]
  review: PsychotherapyReview
}

/** Compact, derived view read by the Therapie module. */
export interface PsychotherapySummary {
  status: PsychotherapyStatus
  currentStage?: string
  mainGoal?: string
  method?: string
  frequency?: string
  plannedDuration?: string
  lastSessionDate?: string
  nextFocus?: string
  progressStatus?: ProgressStatus | string
}

export function createEmptyPsychotherapyPlan(): PsychotherapyPlan {
  return {
    version: PSYCHOTHERAPY_PLAN_VERSION,
    updatedAt: new Date().toISOString(),
    overview: { status: 'not-started' },
    indication: '',
    clinicalRationale: '',
    goals: { shortTerm: [], mediumTerm: [], longTerm: [] },
    stages: [],
    methods: [],
    plannedSessions: [],
    sessions: [],
    review: {},
  }
}

/** Normalizes a possibly-partial plan (e.g. from an older vault payload) to the current shape. */
export function ensurePsychotherapyPlan(plan: Partial<PsychotherapyPlan> | null | undefined): PsychotherapyPlan {
  const base = createEmptyPsychotherapyPlan()
  if (!plan) return base
  return {
    version: PSYCHOTHERAPY_PLAN_VERSION,
    updatedAt: plan.updatedAt ?? base.updatedAt,
    overview: {
      status: plan.overview?.status ?? 'not-started',
      therapist: plan.overview?.therapist ?? '',
      setting: plan.overview?.setting ?? '',
      frequency: plan.overview?.frequency ?? '',
      plannedDuration: plan.overview?.plannedDuration ?? '',
      startDate: plan.overview?.startDate ?? '',
      reviewDate: plan.overview?.reviewDate ?? '',
    },
    indication: plan.indication ?? '',
    clinicalRationale: plan.clinicalRationale ?? '',
    goals: {
      shortTerm: plan.goals?.shortTerm ?? [],
      mediumTerm: plan.goals?.mediumTerm ?? [],
      longTerm: plan.goals?.longTerm ?? [],
    },
    stages: plan.stages ?? [],
    methods: plan.methods ?? [],
    plannedSessions: plan.plannedSessions ?? [],
    sessions: plan.sessions ?? [],
    review: {
      progress: plan.review?.progress ?? '',
      barriers: plan.review?.barriers ?? '',
      planAdjustment: plan.review?.planAdjustment ?? '',
      dischargeSummaryPrep: plan.review?.dischargeSummaryPrep ?? '',
    },
  }
}

export function isPlanEmpty(plan: PsychotherapyPlan): boolean {
  return (
    plan.overview.status === 'not-started' &&
    !plan.indication?.trim() &&
    !plan.clinicalRationale?.trim() &&
    plan.goals.shortTerm.length === 0 &&
    plan.goals.mediumTerm.length === 0 &&
    plan.goals.longTerm.length === 0 &&
    plan.stages.length === 0 &&
    plan.methods.every((m) => !m.selected) &&
    plan.plannedSessions.length === 0 &&
    plan.sessions.length === 0
  )
}

import type { ClinicalImprintRecord } from '../../types/clinicalImprint'
import type { SafetyRiskSignal } from '../../components/notion/overview/types'
import type {
  VerlaufstendenzComputed,
  VerlaufstendenzTrend,
  VerlaufstendenzWindowPreset,
} from '../../types/verlaufstendenz'
import type { VerlaufFeedEntry } from '../verlaufFeed'
import { computeVerlaufstendenz } from '../verlaufstendenz/compute'
import {
  loadVerlaufstendenzState,
  updateVerlaufstendenzDraft,
} from '../verlaufstendenz/storage'
import { formatDateDe } from './dateLabels'

export interface VerlaufstendenzSummary {
  /** Effective trend shown in UI — clinician override when present, else computed draft. */
  trend: VerlaufstendenzTrend
  rationaleSentence: string
  confidence: VerlaufstendenzComputed['confidence']
  domains: VerlaufstendenzComputed['domains']
  sourceEntries: VerlaufstendenzComputed['sourceEntries']
  windowPreset: VerlaufstendenzWindowPreset
  windowLabel: string
  lastUpdatedLabel: string | null
  /** True when clinician has accepted or overridden the assessment. */
  isClinicianApproved: boolean
  /** Latest rule-based computation (always refreshed on build). */
  computed: VerlaufstendenzComputed
  /** Raw persisted state for edit actions in the card. */
  hasDraft: boolean
}

export interface BuildVerlaufstendenzSummaryInput {
  caseId: string
  imprints: ClinicalImprintRecord[]
  verlaufEntries: VerlaufFeedEntry[]
  harmSignals: SafetyRiskSignal[]
  complianceOverallPercent: number | null
  abnormalLabCount: number
  admissionDateIso: string | null
}

function windowLabel(
  preset: VerlaufstendenzWindowPreset,
  startIso: string | null,
  endIso: string | null,
): string {
  switch (preset) {
    case '7d':
      return '7 Tage'
    case '14d':
      return '14 Tage'
    case 'admission':
      return startIso ? `seit Aufnahme (${formatDateDe(startIso) ?? startIso})` : 'seit Aufnahme'
    case 'custom':
      if (startIso && endIso) {
        return `${formatDateDe(startIso) ?? startIso} – ${formatDateDe(endIso) ?? endIso}`
      }
      return 'Benutzerdefiniert'
  }
}

function draftsEqual(
  existing: VerlaufstendenzComputed | null,
  next: VerlaufstendenzComputed,
): boolean {
  if (!existing) return false
  return (
    existing.trend === next.trend &&
    existing.rationaleSentence === next.rationaleSentence &&
    existing.confidence === next.confidence &&
    existing.computedAt.slice(0, 10) === next.computedAt.slice(0, 10)
  )
}

/** Build overview Verlaufstendenz — deterministic scoring with vault-backed clinician override. */
export function buildVerlaufstendenzSummary(
  input: BuildVerlaufstendenzSummaryInput,
): VerlaufstendenzSummary {
  const state = loadVerlaufstendenzState(input.caseId)
  const computed = computeVerlaufstendenz({
    imprints: input.imprints,
    verlaufEntries: input.verlaufEntries,
    harmSignals: input.harmSignals,
    complianceOverallPercent: input.complianceOverallPercent,
    abnormalLabCount: input.abnormalLabCount,
    admissionDateIso: input.admissionDateIso,
    windowPreset: state.windowPreset,
    customWindowStart: state.customWindowStart,
    customWindowEnd: state.customWindowEnd,
  })

  if (!draftsEqual(state.draft, computed)) {
    updateVerlaufstendenzDraft(computed, input.caseId)
  }

  const refreshed = draftsEqual(state.draft, computed)
    ? state
    : loadVerlaufstendenzState(input.caseId)

  const approved = refreshed.approved
  const trend = approved?.trend ?? computed.trend
  const rationaleSentence = approved?.rationaleSentence ?? computed.rationaleSentence
  const lastUpdatedLabel = approved
    ? formatDateDe(approved.acceptedAt.slice(0, 10))
    : formatDateDe(computed.computedAt.slice(0, 10))

  return {
    trend,
    rationaleSentence,
    confidence: computed.confidence,
    domains: computed.domains,
    sourceEntries: computed.sourceEntries,
    windowPreset: state.windowPreset,
    windowLabel: windowLabel(computed.windowPreset, computed.windowStartIso, computed.windowEndIso),
    lastUpdatedLabel,
    isClinicianApproved: Boolean(approved),
    computed,
    hasDraft: Boolean(refreshed.draft),
  }
}

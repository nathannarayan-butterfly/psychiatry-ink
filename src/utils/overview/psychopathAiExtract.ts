import type { CourseDirection } from '../../types/clinicalImprint'
import type { PsychopathAiStructuredSnapshot } from '../../types/psychopathFinding'
import type { SymptomStructuredCue } from '../../components/notion/overview/types'
import {
  PSYCHOPATH_DOMAIN_I18N_KEYS,
  buildPsychopathDomainHeadings,
  domainsToFields,
  type PsychopathDomainAssessment,
  type PsychopathExtractFieldKey,
  type PsychopathExtractFields,
  type PsychopathExtractResponse,
  type PsychopathOverviewDomainKey,
} from '../../schemas/psychopath/extraction'
import { buildAmdpOverviewGrid } from './psychopathologyDomains'
import { computeContentHash } from '../clinicalMetadata/regexFacts'
import { deidentifyText } from '../documentImport/deidentify'
import { isPsychopathExtractAiEnabled } from '../featureFlags'
import { requestPsychopathExtract } from '../../services/psychopathExtractApi'
import { loadDiagnosen } from '../diagnosenArchive'
import type { UiLanguage } from '../../types/settings'
import {
  loadPsychopathFindingState,
  savePsychopathFindingState,
} from './psychopathFindingStorage'
import { upsertClinicalImprint, imprintKeyFor } from '../clinicalImprint/storage'
import type { PsychopathologyImprintField } from './psychopathologyDomains'
import { translateUi } from '../../data/uiTranslations'

/** Map AI extract keys to imprint fields (null = display-only). */
const EXTRACT_TO_IMPRINT: Partial<Record<PsychopathExtractFieldKey, PsychopathologyImprintField>> = {
  attention: 'cognition',
  memory: 'cognition',
  affect: 'affect',
  drive: 'drive',
  psychomotor: 'drive',
  thoughtContent: 'thoughtContent',
  thoughtForm: 'thoughtForm',
  perception: 'perception',
  selfDisturbance: 'selfDisturbance',
  cognition: 'cognition',
  sleep: 'sleep',
  cooperation: 'cooperation',
  insight: 'insight',
  suicidality: 'suicidality',
  riskSelf: 'riskSelf',
  riskOthers: 'riskOthers',
  aggression: 'aggression',
  functioning: 'functioning',
  socialInteraction: 'socialInteraction',
  hygieneSelfCare: 'hygieneSelfCare',
}

function domainHeadingsForLanguage(language: UiLanguage) {
  const labels = Object.fromEntries(
    (Object.keys(PSYCHOPATH_DOMAIN_I18N_KEYS) as PsychopathOverviewDomainKey[]).map((key) => [
      key,
      translateUi(language, PSYCHOPATH_DOMAIN_I18N_KEYS[key]),
    ]),
  ) as Record<PsychopathOverviewDomainKey, string>
  return buildPsychopathDomainHeadings(labels)
}

export function hashPsychopathSourceText(text: string): string {
  return computeContentHash(text)
}

function snapshotHasStructuredOutput(snapshot: PsychopathAiStructuredSnapshot): boolean {
  const domains = snapshot.domains ?? []
  if (domains.length > 0) return true
  return Object.values(snapshot.fields ?? {}).some((value) => Boolean(value?.trim()))
}

export function isPsychopathAiStructuredStale(
  text: string | null | undefined,
  snapshot: PsychopathAiStructuredSnapshot | null | undefined,
): boolean {
  if (!text?.trim()) return false
  if (!snapshot) return true
  if (snapshot.sourceTextHash !== hashPsychopathSourceText(text)) return true
  if (!snapshotHasStructuredOutput(snapshot)) return true
  return false
}

/** Build Übersicht cue rows from AI-extracted tri-state domains. */
export function buildStructuredCuesFromAiDomains(
  domains: PsychopathDomainAssessment[],
  options: { showAllDomains?: boolean } = {},
): SymptomStructuredCue[] {
  return buildAmdpOverviewGrid({
    imprint: null,
    domains,
    showAllDomains: options.showAllDomains ?? false,
  })
}

/** Build Übersicht cue rows from legacy AI string fields. */
export function buildStructuredCuesFromAiFields(
  fields: PsychopathExtractFields,
  options: { showAllDomains?: boolean } = {},
): SymptomStructuredCue[] {
  return buildAmdpOverviewGrid({
    imprint: null,
    aiFields: fields,
    showAllDomains: options.showAllDomains ?? false,
  })
}

function syncAiFieldsToImprint(
  caseId: string,
  fields: PsychopathExtractFields,
  courseDirection: CourseDirection | null,
  sourceHash: string,
): void {
  const imprintFields: Partial<Record<PsychopathologyImprintField, string | null>> = {}
  for (const [extractKey, imprintField] of Object.entries(EXTRACT_TO_IMPRINT) as Array<
    [PsychopathExtractFieldKey, PsychopathologyImprintField]
  >) {
    const value = fields[extractKey]?.trim()
    if (value) imprintFields[imprintField] = value
  }

  const documented = Object.values(imprintFields).some(Boolean)
  if (!documented) return

  const sourceId = `overview:psychopath-ai:${sourceHash}`
  const now = new Date().toISOString()
  upsertClinicalImprint(
    {
      patientId: caseId,
      caseId,
      sourceType: 'ai_generation',
      sourceId,
      sourceDate: now,
      createdAt: now,
      readableClinicalSentence: 'KI-strukturierter psychopathologischer Befund',
      clinicalDomain: 'psychopathology',
      symptoms: [],
      severity: null,
      courseDirection,
      affect: imprintFields.affect ?? null,
      drive: imprintFields.drive ?? null,
      thoughtForm: imprintFields.thoughtForm ?? null,
      thoughtContent: imprintFields.thoughtContent ?? null,
      perception: imprintFields.perception ?? null,
      selfDisturbance: imprintFields.selfDisturbance ?? null,
      cognition: imprintFields.cognition ?? null,
      sleep: imprintFields.sleep ?? null,
      cooperation: imprintFields.cooperation ?? null,
      insight: imprintFields.insight ?? null,
      riskSelf: imprintFields.riskSelf ?? null,
      riskOthers: imprintFields.riskOthers ?? null,
      aggression: imprintFields.aggression ?? null,
      suicidality: imprintFields.suicidality ?? null,
      functioning: imprintFields.functioning ?? null,
      socialInteraction: imprintFields.socialInteraction ?? null,
      hygieneSelfCare: imprintFields.hygieneSelfCare ?? null,
      medicationMentioned: [],
      medicationResponse: null,
      sideEffects: null,
      adherence: null,
      diagnosisHints: [],
      differentialDiagnosisHints: [],
      uncertainty: null,
      evidenceStrength: 'inferred',
      evidenceText: null,
      evidenceQuoteRange: null,
      analysisEligible: true,
      excludeReason: null,
      imprintKey: imprintKeyFor('ai_generation', sourceId),
    },
    caseId,
  )
}

export function savePsychopathAiStructuredSnapshot(
  caseId: string,
  snapshot: PsychopathAiStructuredSnapshot,
  options: { syncImprint?: boolean } = {},
): void {
  const state = loadPsychopathFindingState(caseId)
  savePsychopathFindingState({ ...state, aiStructured: snapshot }, caseId)
  if (options.syncImprint && snapshot.status === 'accepted') {
    const fields = snapshot.domains?.length
      ? domainsToFields(snapshot.domains)
      : snapshot.fields
    syncAiFieldsToImprint(caseId, fields, snapshot.courseDirection, snapshot.sourceTextHash)
  }
}

export function acceptPsychopathAiStructured(caseId: string): PsychopathAiStructuredSnapshot | null {
  const state = loadPsychopathFindingState(caseId)
  const current = state.aiStructured
  if (!current) return null
  const accepted: PsychopathAiStructuredSnapshot = {
    ...current,
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
  }
  savePsychopathAiStructuredSnapshot(caseId, accepted, { syncImprint: true })
  return accepted
}

export class PsychopathAiExtractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PsychopathAiExtractError'
  }
}

export interface RunPsychopathAiExtractOptions {
  caseId: string
  sourceText: string
  language: UiLanguage
  patientNames?: string[]
  autoAccept?: boolean
  /** Bypass accepted cache — for tests or explicit re-extract flows. */
  force?: boolean
}

function responseHasStructuredOutput(response: PsychopathExtractResponse): boolean {
  const domains = response.domains ?? []
  if (domains.length > 0) return true
  return Object.values(response.fields ?? {}).some((value) => Boolean(value?.trim()))
}

export async function runPsychopathAiExtract(
  options: RunPsychopathAiExtractOptions,
): Promise<PsychopathAiStructuredSnapshot> {
  if (!isPsychopathExtractAiEnabled()) {
    throw new PsychopathAiExtractError('KI-Extraktion ist deaktiviert (VITE_ENABLE_PSYCHOPATH_EXTRACT_AI)')
  }

  const trimmed = options.sourceText.trim()
  if (!trimmed) {
    throw new PsychopathAiExtractError('Kein Befundtext für die KI-Extraktion vorhanden')
  }
  if (trimmed.length < 20) {
    throw new PsychopathAiExtractError('Befundtext zu kurz für KI-Extraktion (mindestens 20 Zeichen)')
  }

  const sourceTextHash = hashPsychopathSourceText(trimmed)
  const state = loadPsychopathFindingState(options.caseId)
  if (
    !options.force &&
    state.aiStructured &&
    state.aiStructured.sourceTextHash === sourceTextHash &&
    (state.aiStructured.status === 'accepted' || state.aiStructured.status === 'pending') &&
    snapshotHasStructuredOutput(state.aiStructured)
  ) {
    return state.aiStructured
  }

  const { text: deidentifiedText } = deidentifyText(trimmed, {
    patientNames: options.patientNames,
  })

  const icd10Codes = loadDiagnosen(options.caseId).map((d) => d.icd10.code)
  const response: PsychopathExtractResponse = await requestPsychopathExtract({
    deidentifiedText,
    language: options.language,
    sourceTextHash,
    icd10Codes,
    domainHeadings: domainHeadingsForLanguage(options.language),
  })

  if (!responseHasStructuredOutput(response)) {
    throw new PsychopathAiExtractError('KI-Antwort konnte nicht in Domänen strukturiert werden')
  }

  const domains = response.domains ?? []
  const fields = response.fields ?? (domains.length > 0 ? domainsToFields(domains) : {})

  const snapshot: PsychopathAiStructuredSnapshot = {
    version: 1,
    sourceTextHash,
    extractedAt: new Date().toISOString(),
    status: options.autoAccept ? 'accepted' : 'pending',
    acceptedAt: options.autoAccept ? new Date().toISOString() : undefined,
    domains,
    fields,
    courseDirection: response.courseDirection ?? null,
    confidence: response.confidence ?? 'medium',
    mock: response.mock,
  }

  savePsychopathAiStructuredSnapshot(options.caseId, snapshot, {
    syncImprint: options.autoAccept,
  })
  return snapshot
}

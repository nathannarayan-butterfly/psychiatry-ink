/**
 * Clinical Metadata accessor — the ONE read-only entry point consumers use to
 * read CMEA facts off the clinical-imprint index. No consumer should ever call
 * the LLM directly; they read pre-computed, provenance-tagged facts from here.
 *
 * v1 imprint records (no `facts`) transparently up-convert to `facts: []`, so
 * callers can rely on these selectors regardless of when a record was written.
 */

import { loadClinicalImprintIndex } from '../clinicalImprint/storage'
import {
  CMEA_EXTRACTOR_VERSION,
  CMEA_SCHEMA_VERSION,
  type ClinicalFact,
  type DiagnosisHintFact,
  type LabSignalFact,
  type MedicationTrialFact,
  type RiskFact,
  type SymptomFact,
  isFactKind,
} from '../../types/clinicalMetadata'
import type { IsdmPhenomenologyDomain } from '../../types/isdm'
import type { ClinicalImprintRecord } from '../../types/clinicalImprint'

/** Up-convert a record to its facts array (v1 records → `[]`). */
function recordFacts(record: ClinicalImprintRecord): ClinicalFact[] {
  return Array.isArray(record.facts) ? record.facts : []
}

/** Every fact for a case, flattened across all imprint records. */
export function allFacts(caseId?: string): ClinicalFact[] {
  const index = loadClinicalImprintIndex(caseId)
  const facts: ClinicalFact[] = []
  for (const record of index.imprints) {
    facts.push(...recordFacts(record))
  }
  return facts
}

export function symptomFacts(caseId?: string, domain?: IsdmPhenomenologyDomain): SymptomFact[] {
  const facts = allFacts(caseId).filter((fact): fact is SymptomFact => isFactKind(fact, 'symptom'))
  return domain ? facts.filter((fact) => fact.domain === domain) : facts
}

export function medicationTrials(caseId?: string): MedicationTrialFact[] {
  return allFacts(caseId).filter((fact): fact is MedicationTrialFact =>
    isFactKind(fact, 'medication_trial'),
  )
}

export function riskFacts(caseId?: string): RiskFact[] {
  return allFacts(caseId).filter((fact): fact is RiskFact => isFactKind(fact, 'risk'))
}

export function labSignals(caseId?: string): LabSignalFact[] {
  return allFacts(caseId).filter((fact): fact is LabSignalFact => isFactKind(fact, 'lab_signal'))
}

export function diagnosisHints(caseId?: string): DiagnosisHintFact[] {
  return allFacts(caseId).filter((fact): fact is DiagnosisHintFact =>
    isFactKind(fact, 'diagnosis_hint'),
  )
}

/** All facts that originated from a single source document/section. */
export function factsForSource(caseId: string | undefined, sourceId: string): ClinicalFact[] {
  return allFacts(caseId).filter((fact) => fact.provenance.sourceId === sourceId)
}

export interface CaseFactsFreshness {
  schemaVersion: number
  extractorVersion: number
  totalFacts: number
  regexFacts: number
  llmFacts: number
  clinicianFacts: number
  /** True when at least one fact came from the LLM enrichment pass. */
  hasLlmEnrichment: boolean
  /** Records whose extractorVersion is older than the current logic version. */
  staleRecordCount: number
  /** Most recent source date across all facts, ISO string or null. */
  lastSourceDate: string | null
}

/**
 * Freshness/versioning snapshot for a case — lets consumers (and the
 * orchestrator's freshness gate / bulk reindex) decide whether cached facts are
 * current without re-running the LLM.
 */
export function freshness(caseId?: string): CaseFactsFreshness {
  const index = loadClinicalImprintIndex(caseId)
  let regex = 0
  let llm = 0
  let clinician = 0
  let stale = 0
  let lastSourceDate: string | null = null

  for (const record of index.imprints) {
    const recordVersion = record.extractorVersion ?? 0
    if (recordVersion < CMEA_EXTRACTOR_VERSION) stale += 1
    for (const fact of recordFacts(record)) {
      if (fact.provenance.extractor === 'regex') regex += 1
      else if (fact.provenance.extractor === 'llm') llm += 1
      else if (fact.provenance.extractor === 'clinician') clinician += 1
      const date = fact.provenance.sourceDate
      if (date && (!lastSourceDate || date > lastSourceDate)) lastSourceDate = date
    }
  }

  return {
    schemaVersion: CMEA_SCHEMA_VERSION,
    extractorVersion: CMEA_EXTRACTOR_VERSION,
    totalFacts: regex + llm + clinician,
    regexFacts: regex,
    llmFacts: llm,
    clinicianFacts: clinician,
    hasLlmEnrichment: llm > 0,
    staleRecordCount: stale,
    lastSourceDate,
  }
}

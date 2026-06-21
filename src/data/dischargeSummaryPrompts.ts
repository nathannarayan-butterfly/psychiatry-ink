import type {
  DischargeSummaryDocumentType,
  DischargeSummaryRegion,
  HospitalCourseLength,
} from '../types/dischargeSummary'
import { applyRegionSpelling } from '../utils/dischargeSummary/regionSpelling'

const BASE_RULES =
  'Write in formal, neutral clinical English (discharge summary style). ' +
  'Synthesise rather than dump raw data — do not list disconnected findings without clinical context. ' +
  'Do not invent information: derive only from the evidence provided; mark missing data explicitly as unclear. ' +
  'Use cautious language for risk — document only assessed risk, no speculation beyond the evidence. ' +
  'Never include patient-identifying data (name, date of birth, address, hospital number). ' +
  'Output only the section text — no meta-commentary.'

function regionHint(region: DischargeSummaryRegion): string {
  if (region === 'UK') return 'Use UK English spelling (behaviour, organisation, programme).'
  if (region === 'US') return 'Use US English spelling (behavior, organization, program).'
  return 'Use international clinical English; prefer US spelling unless context suggests UK usage.'
}

export function buildHospitalCourseSystemPrompt(
  documentType: DischargeSummaryDocumentType,
  region: DischargeSummaryRegion,
): string {
  const depth =
    documentType === 'short_discharge_summary'
      ? 'Short discharge summary: focused hospital course covering essential ward episodes and treatment response.'
      : 'Comprehensive psychiatric discharge summary: detailed chronological hospital course with clinical depth.'
  const docLabel =
    documentType === 'short_discharge_summary' ? 'discharge summary' : 'comprehensive psychiatric discharge summary'
  return (
    `You are an experienced psychiatrist drafting the hospital course / treatment and progress section ` +
    `for an English-language ${docLabel}. ${depth} ${BASE_RULES} ${regionHint(region)} ` +
    `For psychosis or high-acuity presentations: admission mental state, medication and tolerability, ` +
    `significant incidents (restrictive measures if documented), stabilisation, and condition at discharge. ` +
    `Chronological, clinically precise, suitable for handover to continuing care.`
  )
}

export function buildHospitalCourseUserPrompt(
  evidenceSummary: string,
  length: HospitalCourseLength,
  region: DischargeSummaryRegion,
): string {
  const lengthHint =
    length === 'compact'
      ? 'Length: compact rough draft (approx. 120–200 words).'
      : length === 'detailed'
        ? 'Length: thorough (approx. 400–650 words).'
        : 'Length: standard (approx. 200–400 words).'
  const text = applyRegionSpelling(evidenceSummary, region)
  return (
    `Draft the hospital course / treatment and progress section from the following de-identified evidence:\n\n` +
    `${text}\n\n${lengthHint}`
  )
}

export function buildRecommendationsSystemPrompt(region: DischargeSummaryRegion): string {
  return (
    `You draft discharge recommendations and special instructions for an English-language psychiatric discharge summary. ` +
    `${BASE_RULES} ${regionHint(region)} ` +
    `Format as actionable bullet points (•). Include only clinically relevant items supported by the evidence: ` +
    `medication adherence, monitoring, risk mitigation, therapy follow-up, social interventions, safeguarding — only when documented.`
  )
}

export function buildRecommendationsUserPrompt(
  evidenceSummary: string,
  region: DischargeSummaryRegion,
): string {
  const text = applyRegionSpelling(evidenceSummary, region)
  return (
    `Draft discharge recommendations / special instructions as bullet points from the following evidence:\n\n${text}`
  )
}

export function buildRiskSummarySystemPrompt(region: DischargeSummaryRegion): string {
  return (
    `You draft a risk assessment summary at discharge for an English-language psychiatric discharge summary. ` +
    `${BASE_RULES} ${regionHint(region)} ` +
    `Document only assessed risks present in the evidence. Use cautious, non-alarmist language. ` +
    `Do not escalate risk beyond what is documented.`
  )
}

export function buildRiskSummaryUserPrompt(evidenceSummary: string, region: DischargeSummaryRegion): string {
  const text = applyRegionSpelling(evidenceSummary, region)
  return `Draft the risk assessment at discharge from the following de-identified evidence:\n\n${text}`
}

export function buildDiagnosticFormulationSystemPrompt(region: DischargeSummaryRegion): string {
  return (
    `You draft a brief diagnostic formulation for a comprehensive psychiatric discharge summary. ` +
    `${BASE_RULES} ${regionHint(region)} ` +
    `Integrate predisposing, precipitating, perpetuating and protective factors only when supported by evidence.`
  )
}

export function buildDiagnosticFormulationUserPrompt(
  evidenceSummary: string,
  region: DischargeSummaryRegion,
): string {
  const text = applyRegionSpelling(evidenceSummary, region)
  return `Draft a diagnostic formulation from the following de-identified evidence:\n\n${text}`
}

export function buildGenericSectionSystemPrompt(sectionLabel: string, region: DischargeSummaryRegion): string {
  return `You draft the "${sectionLabel}" section for an English-language psychiatric discharge summary. ${BASE_RULES} ${regionHint(region)}`
}

export function buildGenericSectionUserPrompt(
  sectionLabel: string,
  evidenceSummary: string,
  region: DischargeSummaryRegion,
): string {
  const text = applyRegionSpelling(evidenceSummary, region)
  return `Draft "${sectionLabel}" from the following de-identified evidence:\n\n${text}`
}

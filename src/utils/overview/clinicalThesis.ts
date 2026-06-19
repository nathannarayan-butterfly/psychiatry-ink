import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { loadNotionDocumentSnapshot } from '../notionDocumentActions'
import { resolvePsychopathologyText } from './psychopathSnapshot'
import { loadClinicalImprintIndex } from '../clinicalImprint'
import { loadDiagnosen, selectPrimaryCoding } from '../diagnosenArchive'
import type { ClinicalImprintRecord, CourseDirection } from '../../types/clinicalImprint'

function clamp(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

function latestPsychopathImprint(imprints: ClinicalImprintRecord[]): ClinicalImprintRecord | null {
  return (
    [...imprints]
      .filter((i) => i.clinicalDomain === 'psychopathology')
      .sort((a, b) => (b.sourceDate ?? '').localeCompare(a.sourceDate ?? ''))[0] ?? null
  )
}

const COURSE_PHRASE: Partial<Record<CourseDirection, string>> = {
  improved: 'Besserung',
  stable: 'Stabilisierung',
  worsened: 'Verschlechterung',
  fluctuating: 'Fluktuation',
  resolved: 'Remission',
}

/** Compose a lead clause from documented Verlauf / Therapieverlauf sections — no invented facts. */
export function composeThesisFromDocumentedSections(
  psychopathologie: string | undefined,
  complianceInsight: string | undefined,
  therapieVerlauf: string | undefined,
): string | null {
  const clauses: string[] = []

  const hasStabilization = Boolean(therapieVerlauf?.match(/stabilisierung/i))
  const hasParanoidContext = Boolean(psychopathologie?.match(/paranoid/i))
  const hasAntipsychotic = Boolean(therapieVerlauf?.match(/antipsychotikum/i))

  if (hasStabilization) {
    let lead = 'Stabilisierung'
    if (hasParanoidContext) lead += ' der paranoiden Symptomatik'
    if (hasAntipsychotic) lead += ' unter Antipsychotikum'
    clauses.push(lead)
  } else if (psychopathologie) {
    const firstClause = psychopathologie.split(/[.;]/)[0]?.trim()
    if (firstClause && firstClause.length > 20) clauses.push(firstClause)
  } else if (therapieVerlauf) {
    const firstClause = therapieVerlauf.split(/[.;]/)[0]?.trim()
    if (firstClause && firstClause.length > 20) clauses.push(firstClause)
  }

  if (complianceInsight?.match(/einsicht/i)) {
    const insightMatch = complianceInsight.match(/einsicht[^.]*/i)
    if (insightMatch) {
      const tail = insightMatch[0].replace(/^einsicht\s*/i, '').trim()
      if (tail) clauses.push(`Krankheitseinsicht ${tail}`)
    }
  }

  if (clauses.length >= 2) return clamp(`${clauses.join(' — ')}.`, 220)
  if (clauses.length === 1 && clauses[0].length >= 30) return clamp(`${clauses[0]}.`, 220)
  return null
}

function composeFromImprint(imprint: ClinicalImprintRecord): string | null {
  const parts: string[] = []
  const course = imprint.courseDirection ? COURSE_PHRASE[imprint.courseDirection] : null
  if (course) parts.push(course)

  if (imprint.thoughtContent?.match(/paranoid/i)) {
    parts.push('paranoide Symptomatik')
  } else if (imprint.readableClinicalSentence) {
    const sentence = imprint.readableClinicalSentence.split(/[.;]/)[0]?.trim()
    if (sentence && sentence.length > 20) parts.push(sentence)
  }

  if (imprint.insight?.match(/zunehmend|verbessert/i)) {
    parts.push(`Krankheitseinsicht ${imprint.insight}`)
  }

  if (parts.length >= 2) return clamp(parts.join(' — '), 220)
  if (imprint.readableClinicalSentence && imprint.readableClinicalSentence.length > 30) {
    return clamp(imprint.readableClinicalSentence, 220)
  }
  return null
}

function thesisFromPrimaryDiagnosis(caseId: string): string | null {
  const primary = loadDiagnosen(caseId)[0]
  if (!primary) return null
  const selected = selectPrimaryCoding(primary)
  if (!selected.coding.code.trim() && !selected.coding.label.trim()) return null
  const label = selected.coding.label.trim()
  const code = selected.coding.code.trim()
  if (code && label) return clamp(`${code} — ${label}`, 220)
  return clamp(code || label, 220)
}

function thesisFromAdmissionContext(caseId: string): string | null {
  for (const docType of ['aufnahme', 'anamnese'] as const) {
    const sections = loadNotionDocumentSnapshot(docType, caseId)?.sectionContents ?? {}
    for (const key of ['aufnahmeanlass', 'aktuelle-beschwerden', 'aufnahmegrund', 'body']) {
      const text = sections[key]?.trim()
      if (text && text.length > 25) return clamp(text.split(/[.;]/)[0] ?? text, 220)
    }
  }
  return null
}

/**
 * Derive a one-line clinical thesis for the Übersicht hero from real documentation.
 * Synthesizes from Verlauf sections, psychopathology imprints, and narrative fallbacks.
 */
export function buildClinicalThesis(caseId: string): string | null {
  const registrySubheading = getCaseMeta(caseId)?.localClinicalSubheading?.trim()
  if (registrySubheading) return clamp(registrySubheading, 220)

  const verlaufSnap = loadNotionDocumentSnapshot('verlauf', caseId)
  const sections = verlaufSnap?.sectionContents ?? {}
  const therapieBody = loadNotionDocumentSnapshot('therapie-verlauf', caseId)?.sectionContents['body']?.trim()
  const psychopathFromDocs =
    sections['psychopathologie']?.trim() ?? resolvePsychopathologyText(caseId).text?.trim()

  const fromSections = composeThesisFromDocumentedSections(
    psychopathFromDocs,
    sections['compliance-krankheitseinsicht']?.trim(),
    therapieBody,
  )
  if (fromSections) return fromSections

  const beurteilung = sections['beurteilung-plan']?.trim()
  if (beurteilung && beurteilung.length > 25) {
    return clamp(beurteilung.split(/[.;]/)[0] ?? beurteilung, 220)
  }

  const imprint = latestPsychopathImprint(loadClinicalImprintIndex(caseId).imprints)
  if (imprint) {
    const fromImprint = composeFromImprint(imprint)
    if (fromImprint) return fromImprint
  }

  const psychopathText = resolvePsychopathologyText(caseId).text?.trim()
  if (psychopathText && psychopathText.length > 20) {
    return clamp(psychopathText, 220)
  }

  const risiko = sections['risiko']?.trim()
  if (risiko && risiko.length > 20) {
    return clamp(risiko, 220)
  }

  const fromDiagnosis = thesisFromPrimaryDiagnosis(caseId)
  if (fromDiagnosis) return fromDiagnosis

  const fromAdmission = thesisFromAdmissionContext(caseId)
  if (fromAdmission) return fromAdmission

  return null
}

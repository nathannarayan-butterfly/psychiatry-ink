/**
 * Post-parse consolidation — merges related candidates before review.
 *
 * Aufnahme letters often yield one import candidate per subsection (Aktuelle
 * Anamnese, Psychiatrische Vorgeschichte, …). Psychiatry.Ink stores these as a
 * single Aufnahmebefund with `sectionContents`, so we fold them here.
 */
import { defaultAufnahmeSections } from '../../data/aufnahmeSections'
import type { ClinicalImportCandidate } from '../../schemas/documentImport/envelope'
import { parseAnamneseSections } from '../anamnese/parseSections'
import { appendComplementaryTherapyCandidatesFromMentions } from './complementaryTherapyDetection'
import { appendMedicationCandidatesFromNarrative } from './medicationExtraction'
import { makeCandidate } from './candidateFactory'

const AUFNAHME_SECTION_ORDER = defaultAufnahmeSections.map((section) => section.id)

function isAnamneseCandidate(
  candidate: ClinicalImportCandidate,
): candidate is Extract<ClinicalImportCandidate, { module: 'anamnese' }> {
  return candidate.module === 'anamnese'
}

function shouldMergeAnamneseCandidates(anamnese: Extract<ClinicalImportCandidate, { module: 'anamnese' }>[]): boolean {
  if (anamnese.length === 0) return false
  if (anamnese.length > 1) return true
  return Boolean(anamnese[0].data.sectionId)
}

function appendSectionContent(target: Record<string, string>, sectionId: string, text: string): void {
  const trimmed = text.trim()
  if (!trimmed) return
  target[sectionId] = target[sectionId] ? `${target[sectionId]}\n\n${trimmed}` : trimmed
}

function buildAufnahmeSectionContents(
  anamnese: Extract<ClinicalImportCandidate, { module: 'anamnese' }>[],
): Record<string, string> {
  const sectionContents: Record<string, string> = {}

  for (const candidate of anamnese) {
    const { sectionId, text } = candidate.data
    const trimmed = text.trim()
    if (!trimmed) continue

    if (sectionId) {
      appendSectionContent(sectionContents, sectionId, trimmed)
      continue
    }

    const parsed = parseAnamneseSections(trimmed)
    const parsedIds = Object.keys(parsed)
    if (parsedIds.length > 0) {
      for (const id of parsedIds) {
        appendSectionContent(sectionContents, id, parsed[id] ?? '')
      }
      continue
    }

    appendSectionContent(sectionContents, 'aufnahmeanlass', trimmed)
  }

  return sectionContents
}

function joinAufnahmeText(sectionContents: Record<string, string>): string {
  return AUFNAHME_SECTION_ORDER
    .map((sectionId) => sectionContents[sectionId]?.trim())
    .filter((value): value is string => Boolean(value))
    .join('\n\n')
}

function mergeAnamneseIntoAufnahmebefund(
  anamnese: Extract<ClinicalImportCandidate, { module: 'anamnese' }>[],
): ClinicalImportCandidate {
  const sectionContents = buildAufnahmeSectionContents(anamnese)
  const text = joinAufnahmeText(sectionContents)
  const clarifications = anamnese.flatMap((candidate) => candidate.clarifications ?? [])
  const confidence = anamnese.some((candidate) => candidate.confidence === 'low')
    ? 'low'
    : anamnese.some((candidate) => candidate.confidence === 'medium')
      ? 'medium'
      : 'high'

  return makeCandidate({
    module: 'anamnese',
    confidence,
    sourceLocation: anamnese[0].sourceLocation,
    rawText: anamnese.map((candidate) => candidate.rawText ?? candidate.data.text).join('\n\n'),
    clarifications: clarifications.length > 0 ? clarifications : undefined,
    data: {
      title: 'Aufnahmebefund',
      text: text || anamnese.map((candidate) => candidate.data.text).join('\n\n'),
      sectionContents,
    },
  })
}

/**
 * Fold aufnahme subsection candidates into one Aufnahmebefund while leaving all
 * other module candidates untouched.
 */
export function consolidateImportCandidates(candidates: ClinicalImportCandidate[]): ClinicalImportCandidate[] {
  let result = candidates
  const anamnese = result.filter(isAnamneseCandidate)
  if (shouldMergeAnamneseCandidates(anamnese)) {
    const rest = result.filter((candidate) => candidate.module !== 'anamnese')
    result = [mergeAnamneseIntoAufnahmebefund(anamnese), ...rest]
  }
  result = appendMedicationCandidatesFromNarrative(result)
  result = appendComplementaryTherapyCandidatesFromMentions(result)
  return result
}

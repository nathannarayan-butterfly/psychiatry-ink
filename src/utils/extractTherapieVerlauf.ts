import { defaultTherapieVerlaufSections } from '../data/therapieVerlaufSections'

export interface TherapieVerlaufSectionTarget {
  id: string
  label: string
  description?: string
  aliases: string[]
}

const EXTRACTION_TARGETS: TherapieVerlaufSectionTarget[] =
  defaultTherapieVerlaufSections.map((section) => ({
    id: section.id,
    label: section.label,
    description: section.description,
    aliases: buildAliases(section.id, section.label),
  }))

function buildAliases(id: string, label: string): string[] {
  const aliases = new Set<string>([label])

  const byId: Record<string, string[]> = {
    'aufnahmeanlass-verlegungsgrund': [
      'Aufnahmeanlass',
      'Verlegungsgrund',
      'Ausgangslage',
      'Aufnahmegrund',
      'Verlegung',
      'Aufnahmeanlass / Verlegungsgrund',
    ],
    'psychopathologischer-ausgangsbefund': [
      'Psychopathologischer Ausgangsbefund',
      'Ausgangsbefund',
      'Psychopathologie bei Aufnahme',
      'Psychopathologischer Befund bei Aufnahme',
    ],
    'initiales-stationsverhalten': [
      'Initiales Stationsverhalten',
      'Stationsverhalten',
      'Führbarkeit',
      'Initiales Verhalten',
    ],
    'diagnostische-einordnung': [
      'Diagnostische Einordnung',
      'Behandlungsplanung',
      'Diagnostik',
      'Behandlungskonzept',
    ],
    'psychopharmakologische-behandlung': [
      'Psychopharmakologische Behandlung',
      'Medikation',
      'Psychopharmakotherapie',
      'Medikamentöse Behandlung',
      'Verträglichkeit',
    ],
    'therapeutische-massnahmen': [
      'Therapeutische Maßnahmen',
      'Pflegerische Maßnahmen',
      'Milieutherapie',
      'Therapeutische, pflegerische',
      'Therapieangebote',
    ],
    'besondere-ereignisse': [
      'Besondere Ereignisse',
      'Sicherungsmaßnahmen',
      'Zwischenfälle',
      'Besondere Vorkommnisse',
    ],
    'stabilisierung-besserung': [
      'Stabilisierung',
      'Psychopathologische Besserung',
      'Besserung',
      'Verlaufsbesserung',
    ],
    'entlassungs-rueckverlegungszustand': [
      'Entlassungszustand',
      'Rückverlegungszustand',
      'Entlassung',
      'Rückverlegung',
      'Entlassungs-/Rückverlegungszustand',
    ],
    'empfehlungen-hinweise': [
      'Empfehlungen',
      'Besondere Hinweise',
      'Weiterbehandlung',
      'Empfehlung',
    ],
  }

  for (const entry of byId[id] ?? []) {
    aliases.add(entry)
  }

  return [...aliases]
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHeadingPattern(alias: string): RegExp {
  const escaped = escapeRegex(alias.trim())
  return new RegExp(
    `(?:^|\\n)\\s*(?:\\d{1,2}[.)]\\s*)?(?:#{1,3}\\s*)?(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*(?:[:\\-–—]|$)`,
    'i',
  )
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function findSectionStarts(text: string): Array<{ index: number; sectionId: string }> {
  const matches: Array<{ index: number; sectionId: string; aliasLength: number }> = []

  for (const target of EXTRACTION_TARGETS) {
    for (const alias of target.aliases) {
      const pattern = buildHeadingPattern(alias)
      const match = pattern.exec(text)
      if (!match || match.index === undefined) continue

      matches.push({
        index: match.index,
        sectionId: target.id,
        aliasLength: alias.length,
      })
    }
  }

  matches.sort((a, b) => a.index - b.index || b.aliasLength - a.aliasLength)

  const deduped: Array<{ index: number; sectionId: string }> = []
  const usedIndexes = new Set<number>()

  for (const match of matches) {
    if (usedIndexes.has(match.index)) continue
    usedIndexes.add(match.index)
    if (deduped.some((item) => item.sectionId === match.sectionId)) continue
    deduped.push({ index: match.index, sectionId: match.sectionId })
  }

  return deduped.sort((a, b) => a.index - b.index)
}

function stripHeadingLine(chunk: string, target: TherapieVerlaufSectionTarget): string {
  let result = chunk.trim()

  for (const alias of target.aliases) {
    const pattern = new RegExp(
      `^\\s*(?:\\d{1,2}[.)]\\s*)?(?:#{1,3}\\s*)?(?:\\*\\*)?${escapeRegex(alias)}(?:\\*\\*)?\\s*(?:[:\\-–—]|$)\\s*`,
      'i',
    )
    result = result.replace(pattern, '')
  }

  return normalizeWhitespace(result)
}

function scoreSectionByKeywords(text: string, target: TherapieVerlaufSectionTarget): number {
  const lower = text.toLowerCase()
  const keywords: Record<string, string[]> = {
    'aufnahmeanlass-verlegungsgrund': [
      'aufnahme',
      'verlegung',
      'jva',
      'decompensation',
      'dekompensation',
      'aufnahmegrund',
    ],
    'psychopathologischer-ausgangsbefund': [
      'bewusstsein',
      'orientierung',
      'kontakt',
      'affekt',
      'denken',
      'einsicht',
      'suizid',
    ],
    'initiales-stationsverhalten': [
      'stationsverhalten',
      'führbar',
      'hygiene',
      'kooperativ',
      'reizbar',
      'absprachefähig',
    ],
    'diagnostische-einordnung': [
      'diagnostisch',
      'schizophrenie',
      'behandlungsplan',
      'arbeitsdiagnose',
      'eingeordnet',
    ],
    'psychopharmakologische-behandlung': [
      'medikation',
      'antipsychot',
      'depot',
      'pipamperon',
      'verträglich',
      'compliance',
    ],
    'therapeutische-massnahmen': [
      'ergotherap',
      'psychoeduk',
      'milieutherap',
      'körperpflege',
      'alltagsstruktur',
    ],
    'besondere-ereignisse': [
      'fixierung',
      'bgh',
      'zwangsmedikation',
      'eskalation',
      'fremdgefährdung',
      'eigengefährdung',
    ],
    'stabilisierung-besserung': [
      'stabilisierung',
      'besserung',
      'remission',
      'residual',
      'kooperativ',
      'ruhiger',
    ],
    'entlassungs-rueckverlegungszustand': [
      'entlassung',
      'rückverlegung',
      'entlassungszeitpunkt',
      'weiterbehandlung',
    ],
    'empfehlungen-hinweise': [
      'empfehl',
      'wir bitten',
      'labor',
      'ekg',
      'überwachte medikamenteneinnahme',
    ],
  }

  return (keywords[target.id] ?? []).reduce(
    (score, keyword) => score + (lower.includes(keyword) ? 1 : 0),
    0,
  )
}

function splitByParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
}

function heuristicDistribute(text: string): Record<string, string> {
  const result = Object.fromEntries(
    EXTRACTION_TARGETS.map((target) => [target.id, '']),
  ) as Record<string, string>

  const paragraphs = splitByParagraphs(text)
  if (paragraphs.length === 0) return result

  for (const paragraph of paragraphs) {
    let bestId = EXTRACTION_TARGETS[0].id
    let bestScore = -1

    for (const target of EXTRACTION_TARGETS) {
      const score = scoreSectionByKeywords(paragraph, target)
      if (score > bestScore) {
        bestScore = score
        bestId = target.id
      }
    }

    result[bestId] = result[bestId]
      ? `${result[bestId]}\n\n${paragraph}`
      : paragraph
  }

  return result
}

export function extractTherapieVerlaufSections(
  pastedText: string,
): Record<string, string> {
  const text = normalizeWhitespace(pastedText)
  if (!text) {
    return Object.fromEntries(EXTRACTION_TARGETS.map((target) => [target.id, '']))
  }

  const starts = findSectionStarts(text)

  if (starts.length === 0) {
    return heuristicDistribute(text)
  }

  const extracted = Object.fromEntries(
    EXTRACTION_TARGETS.map((target) => [target.id, '']),
  ) as Record<string, string>

  for (let index = 0; index < starts.length; index += 1) {
    const current = starts[index]
    const next = starts[index + 1]
    const target = EXTRACTION_TARGETS.find((item) => item.id === current.sectionId)
    if (!target) continue

    const slice = text.slice(current.index, next?.index ?? text.length)
    const content = stripHeadingLine(slice, target)
    if (content) {
      extracted[current.sectionId] = content
    }
  }

  const unmatched = normalizeWhitespace(
    text.slice(0, starts[0]?.index ?? 0),
  )
  if (unmatched) {
    const firstTarget = EXTRACTION_TARGETS[0]
    extracted[firstTarget.id] = extracted[firstTarget.id]
      ? `${unmatched}\n\n${extracted[firstTarget.id]}`
      : unmatched
  }

  return extracted
}

export function getTherapieVerlaufExtractionTargets(): TherapieVerlaufSectionTarget[] {
  return EXTRACTION_TARGETS.map((target) => ({ ...target, aliases: [...target.aliases] }))
}

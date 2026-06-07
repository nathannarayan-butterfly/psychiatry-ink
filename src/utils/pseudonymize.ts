/**
 * Client-side pseudonymization layer.
 *
 * Replaces identifiable tokens (patient name/DOB, relatives, institutions,
 * places) with opaque placeholders before AI calls, then restores originals
 * from the in-memory map after the response. The map never leaves the browser.
 *
 * Conservative design: prefer missing a name over breaking clinical meaning.
 */

export interface PseudoMap {
  [placeholder: string]: string
}

export interface PseudonymizeResult {
  text: string
  map: PseudoMap
  count: number
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Word-boundary-aware replacement that handles German umlauts. */
function replaceAll(text: string, word: string, replacement: string): string {
  const re = new RegExp(
    `(?<![A-Za-züöäÜÖÄß])${escapeRegex(word)}(?![A-Za-züöäÜÖÄß])`,
    'g',
  )
  return text.replace(re, replacement)
}

/**
 * Clinical and common German words that should never be treated as person/place
 * names even when they appear after prepositions or relationship keywords.
 */
const CLINICAL_STOPWORDS = new Set([
  'Aufnahme', 'Ambulanz', 'Station', 'Diagnose', 'Befund', 'Therapie',
  'Medikation', 'Behandlung', 'Zustand', 'Anamnese', 'Verlauf',
  'Psychiatrie', 'Patient', 'Patientin', 'Arzt', 'Ärztin', 'Pflege',
  'Bericht', 'Regel', 'Einschätzung', 'Stimmung', 'Verhalten',
  'Familie', 'Haushalt', 'Wohnung', 'Auftrag', 'Zusammenhang',
  'Hinsicht', 'Klinik', 'Krankenhaus', 'Zentrum', 'Praxis',
  'Abteilung', 'Einheit', 'Gruppe', 'Team', 'Bereich', 'Sektion',
])

/**
 * Relationship keywords in German that may precede a relative's name.
 * Pattern: <keyword> [optional pronoun/article] <ProperNoun>
 */
const RELATIVE_KEYWORDS =
  'Mutter|Vater|Bruder|Schwester|Ehemann|Ehefrau|Tochter|Sohn|Eltern|' +
  'Oma|Opa|Großmutter|Großvater|Onkel|Tante|Nichte|Neffe|' +
  'Stiefmutter|Stiefvater|Halbbruder|Halbschwester|' +
  'Partner|Partnerin|Freund|Freundin|Lebensgefährte|Lebensgefährtin'

/**
 * Institution-name suffixes in German. The regex requires at least one
 * additional character before the suffix so bare "Klinik" is not matched.
 */
const INSTITUTION_SUFFIX_RE =
  /\b([A-ZÜÖÄ][A-Za-züöäÜÖÄß\-]*(?:klinik(?:en)?|krankenhaus|klinikum|fachklinik|tagesklinik|psychiatrie|reha|rehabilitationszentrum|ambulanz|zentrum|praxis|stift))\b/gi

/**
 * Geographic context phrases that reliably precede a place name.
 * Conservative: avoid "in X" to prevent false positives at sentence start.
 */
const PLACE_CONTEXT_RE =
  /\b(?:wohnhaft\s+in|aufgewachsen\s+in|geboren\s+in|lebt?\s+in|wohnt?\s+in|umgezogen\s+nach|zieht?\s+nach|kommt?\s+aus|stammt?\s+aus|aus\s+dem\s+(?:Raum|Ort|Gebiet|Stadtgebiet|Bezirk)\s+)\s*([A-ZÜÖÄ][a-züöäß]{2,}(?:-[A-ZÜÖÄ][a-züöäß]+)?(?:\s+[A-ZÜÖÄ][a-züöäß]{2,})?)/g

export function pseudonymizeText(
  text: string,
  hints: {
    patientName?: string
    patientDob?: string
  },
): PseudonymizeResult {
  if (!text.trim()) return { text, map: {}, count: 0 }

  const map: PseudoMap = {}
  let result = text
  let count = 0
  let personCounter = 1
  let placeCounter = 1
  let institutionCounter = 1

  function applyReplacement(placeholder: string, original: string): void {
    const before = result
    result = replaceAll(result, original, placeholder)
    if (result !== before) count++
  }

  // ── 1. Patient name ──────────────────────────────────────────────────────
  if (hints.patientName?.trim()) {
    const name = hints.patientName.trim()
    const ph = '[PATIENT_1]'
    map[ph] = name

    // Full name first (keeps multi-word match from being split)
    applyReplacement(ph, name)

    // Individual name parts (≥ 4 chars to reduce false positives)
    for (const part of name.split(/\s+/)) {
      if (part.length >= 4 && result.includes(part)) {
        applyReplacement(ph, part)
      }
    }
  }

  // ── 2. Patient date of birth ─────────────────────────────────────────────
  if (hints.patientDob?.trim()) {
    const dob = hints.patientDob.trim()
    const ph = '[DOB_1]'
    map[ph] = dob

    const variants: string[] = [dob]

    // ISO → German
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      const [y, m, d] = dob.split('-')
      if (y && m && d) variants.push(`${d}.${m}.${y}`)
    }
    // German → ISO
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dob)) {
      const parts = dob.split('.')
      const d = parts[0]?.padStart(2, '0')
      const m = parts[1]?.padStart(2, '0')
      const y = parts[2]
      if (d && m && y) variants.push(`${y}-${m}-${d}`)
    }

    for (const variant of variants) {
      const before = result
      result = result.split(variant).join(ph)
      if (result !== before) {
        count++
        break
      }
    }
  }

  // ── 3. Relatives ─────────────────────────────────────────────────────────
  // Pattern: <RelKeyword> [optional pronoun] <CapitalizedName>
  const relativeRe = new RegExp(
    `\\b(?:${RELATIVE_KEYWORDS})\\s+` +
      `(?:(?:der|die|des|sein(?:e[rm]?)?|ihr(?:e[rm]?)?)\\s+)?` +
      `([A-ZÜÖÄ][a-züöäß]{1,}(?:-[A-ZÜÖÄ][a-züöäß]+)?(?:\\s+[A-ZÜÖÄ][a-züöäß]{1,})?)\\b`,
    'g',
  )

  const relativeSeen = new Map<string, string>()
  for (const match of result.matchAll(relativeRe)) {
    const name = match[1]
    if (!name) continue
    const firstWord = name.split(' ')[0] ?? ''
    if (CLINICAL_STOPWORDS.has(firstWord)) continue
    const key = name.toLowerCase()
    if (!relativeSeen.has(key)) {
      const ph = `[PERSON_${personCounter++}]`
      relativeSeen.set(key, ph)
      map[ph] = name
    }
  }
  for (const [, ph] of relativeSeen.entries()) {
    applyReplacement(ph, map[ph] as string)
  }

  // ── 4. Institutions ───────────────────────────────────────────────────────
  // German institution names (compound words ending in clinical suffixes)
  const institutionSeen = new Map<string, string>()
  for (const match of result.matchAll(INSTITUTION_SUFFIX_RE)) {
    const inst = match[1]
    if (!inst) continue
    // Skip if the match is just the bare suffix (no prefix component)
    const suffixOnlyRe =
      /^(?:Klinik(?:en)?|Krankenhaus|Klinikum|Fachklinik|Tagesklinik|Psychiatrie|Reha|Rehabilitationszentrum|Ambulanz|Zentrum|Praxis|Stift)$/i
    if (suffixOnlyRe.test(inst)) continue
    const key = inst.toLowerCase()
    if (!institutionSeen.has(key)) {
      const ph = `[EINRICHTUNG_${institutionCounter++}]`
      institutionSeen.set(key, ph)
      map[ph] = inst
    }
  }
  for (const [, ph] of institutionSeen.entries()) {
    applyReplacement(ph, map[ph] as string)
  }

  // ── 5. Places ─────────────────────────────────────────────────────────────
  // Conservative: only after unambiguous geographic context phrases
  const placeSeen = new Map<string, string>()
  for (const match of result.matchAll(PLACE_CONTEXT_RE)) {
    const place = match[1]
    if (!place) continue
    const firstWord = place.split(' ')[0] ?? ''
    if (CLINICAL_STOPWORDS.has(firstWord)) continue
    const key = place.toLowerCase()
    if (!placeSeen.has(key)) {
      const ph = `[ORT_${placeCounter++}]`
      placeSeen.set(key, ph)
      map[ph] = place
    }
  }
  for (const [, ph] of placeSeen.entries()) {
    applyReplacement(ph, map[ph] as string)
  }

  return { text: result, map, count }
}

/**
 * Restore pseudonymized placeholders from the map.
 * Uses simple split/join to handle all occurrences including within sentences.
 */
export function dePseudonymizeText(text: string, map: PseudoMap): string {
  let result = text
  for (const [placeholder, original] of Object.entries(map)) {
    result = result.split(placeholder).join(original)
  }
  return result
}

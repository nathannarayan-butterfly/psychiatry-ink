/**
 * Shared German-in-English leak detector — the single source of truth for every
 * localization guardrail in the test-suite.
 *
 * ## Why this exists (the systemic root cause)
 *
 * Psychiatry.Ink is German-first: the canonical clinical content, demo fixtures
 * and many builders (`buildDemoFixture`, ISDM/Butterfly `buildAnalysis`,
 * `buildPatientSafety`, the knowledge base, workspace components) were authored
 * in German. The recurring bug is that German text reaches the *English* UI
 * because:
 *   1. a builder/fixture bakes a German string instead of selecting by
 *      `language` (e.g. `kurzinfoDe` used regardless of locale, or a German
 *      summary with no English counterpart), or
 *   2. an `en` value in a translation table was copied from the German one and
 *      never translated (the "Gründlich" class of bug), or
 *   3. a component hardcodes a German constant instead of going through i18n.
 *
 * Each of these had been fixed one screen at a time. This module turns the fix
 * into a permanent, repo-wide guardrail: any English-facing string that contains
 * German is detected here and fails CI. Real German content must be translated —
 * never silenced by widening the allowlist. The allowlist is only for genuine
 * proper nouns / brand names / shared tokens (see `DEFAULT_ALLOWLIST`).
 *
 * How to run:
 *   npm test -- germanLeak            # the guardrail suite
 *   npm test                          # full vitest run (guardrails included)
 */

/** Umlauts and eszett — effectively never appear in English clinical copy. */
export const GERMAN_DIACRITICS = /[äöüÄÖÜßẞ]/

/**
 * High-signal German tokens that essentially never occur standalone in English
 * clinical UI. Matched whole-word (with `\b`) and case-insensitively. Tokens
 * with a plausible English collision (e.g. "die", "war", "am", "im", "fast",
 * "gift", "kind", "rot", "hat", "also") are deliberately excluded to keep the
 * guardrail free of false positives. Extend this list — never weaken it — when a
 * new German marker slips through.
 */
export const GERMAN_TOKENS: readonly string[] = [
  // ── Function words / connectors (German-only standalone) ──
  'und',
  'oder',
  'nicht',
  'kein',
  'keine',
  'keinen',
  'keiner',
  'keines',
  'mit',
  'ohne',
  'für',
  // NOTE: "von"/"vom" are intentionally NOT listed — "von" collides with English
  // clinical eponyms (von Willebrand, von Recklinghausen, von Economo).
  'zur',
  'zum',
  'auf',
  'sich',
  'sind',
  'wird',
  'werden',
  'wurde',
  'wurden',
  'haben',
  'kann',
  'muss',
  'soll',
  'sollte',
  'über',
  'unter',
  'sowie',
  'bzw',
  'beim',
  'eine',
  'einen',
  'einem',
  'einer',
  'eines',
  'durch',
  'gegen',
  'zwischen',
  'wegen',
  'bereits',
  'jedoch',
  'derzeit',
  'aktuell',
  'möglich',
  'erforderlich',
  // ── Frequency / dosing adverbs ──
  'täglich',
  'morgens',
  'mittags',
  'abends',
  'nachts',
  'wöchentlich',
  'monatlich',
  'stündlich',
  // ── Clinical / domain nouns (German spelling) ──
  'Befund',
  'Befunde',
  // NOTE: singular "Diagnose" is omitted — it collides with the English verb
  // "diagnose" ("does not diagnose patients"). German-only forms are kept below.
  'Diagnosen',
  'Diagnostik',
  'Aufnahme',
  'Verlauf',
  'Anamnese',
  'Eigengefährdung',
  'Fremdgefährdung',
  'Selbstgefährdung',
  'Allergie',
  'Allergien',
  'Unverträglichkeit',
  'Unverträglichkeiten',
  'Medikation',
  'Untersuchung',
  'Behandlung',
  'Beschwerden',
  'Wirkstoff',
  'Wirkstoffe',
  'Nebenwirkung',
  'Nebenwirkungen',
  'Wechselwirkung',
  'Wechselwirkungen',
  'Dosierung',
  'Einnahme',
  'Therapie',
  'Therapien',
  'Entwurf',
  'Entwürfe',
  'Zwangsmaßnahme',
  'Zwangsmaßnahmen',
  'Störung',
  'Störungen',
  'Abhängigkeit',
  'Schizophrenie',
  'Wahn',
  'Halluzination',
  'Halluzinationen',
  'Entzug',
  'Toleranz',
  'Verlangen',
  'Kriterium',
  'Kriterien',
  'Hauptdiagnose',
  'Nebendiagnose',
  'Freitext',
  'Abschnitt',
  'Abschnitte',
  'Kurznotiz',
  'Kurzinfo',
  'Arztbrief',
  'Steckbrief',
  'Termin',
  'Termine',
  'Dokumentation',
  'Dokument',
  'Dokumente',
  'Überwacht',
  'Ausstehend',
  'auffällig',
  'unauffällig',
  'verfügbar',
  'genehmigt',
  'beantragt',
  'erfüllt',
  'gründlich',
  'wirtschaftlich',
  'Hinweis',
  'Hinweise',
  'Vorschlag',
  'Empfehlung',
  'Empfehlungen',
  'Erhaltung',
  'Aufsättigung',
  'Häufigkeit',
  'Schweregrad',
  'Halbwertszeit',
]

const GERMAN_TOKEN_SET = new Set(GERMAN_TOKENS.map((t) => t.toLowerCase()))

/**
 * Genuine proper nouns / brand names / shared tokens that are NOT German leaks.
 * Each entry must be a real safe token (lowercased, whole-word match). Document
 * every addition. NEVER add a real German clinical word here to silence a leak.
 */
export const DEFAULT_ALLOWLIST: readonly string[] = [
  // Product / brand names.
  'butterfly',
  'praxis', // "Small Praxis" demo workspace name; English-borrowed brand-ish term.
  // NOTE: the German function word "mit" is NOT allowlisted here — only its
  // uppercase abbreviation form "MIT" is exempt (see ALLOWLIST_CASE_SENSITIVE),
  // so a genuine German "mit" in English copy is still caught.
]

/**
 * Case-sensitive allowlist for tokens whose German meaning is lowercase but whose
 * safe meaning is an uppercase abbreviation (e.g. "MIT", "IM"). Only the exact
 * cased form is exempted; the lowercase German form is still caught.
 */
const ALLOWLIST_CASE_SENSITIVE = new Set<string>(['MIT', 'IM', 'AM'])

const WORD_RE = /[\p{L}][\p{L}\p{M}]*/gu

export interface GermanLeakOptions {
  /** Extra safe tokens (lowercased, whole-word) to ignore for this scan. */
  allowlist?: readonly string[]
}

/**
 * Returns the distinct offending German tokens found in `text` (empty array if
 * clean). A token is flagged when it is a known German marker or contains an
 * umlaut/eszett, and is not present in the (default + caller) allowlist.
 */
export function findGermanTokens(text: string, options: GermanLeakOptions = {}): string[] {
  if (!text) return []
  const extra = (options.allowlist ?? []).map((t) => t.toLowerCase())
  const allow = new Set<string>([...DEFAULT_ALLOWLIST.map((t) => t.toLowerCase()), ...extra])

  const hits = new Set<string>()
  const words = text.match(WORD_RE)
  if (!words) return []

  for (const word of words) {
    if (ALLOWLIST_CASE_SENSITIVE.has(word)) continue
    const lower = word.toLowerCase()
    if (allow.has(lower)) continue
    if (GERMAN_TOKEN_SET.has(lower)) {
      hits.add(word)
      continue
    }
    if (GERMAN_DIACRITICS.test(word)) {
      hits.add(word)
    }
  }
  return [...hits]
}

/** Convenience boolean form of {@link findGermanTokens}. */
export function containsGerman(text: string, options: GermanLeakOptions = {}): boolean {
  return findGermanTokens(text, options).length > 0
}

/**
 * A value path discovered by {@link walkStringFields}, plus its offending tokens.
 */
export interface GermanLeakHit {
  path: string
  value: string
  tokens: string[]
}

/**
 * Keys whose string values are stable internal identifiers / enum slugs / codes
 * rather than user-facing copy. These are never rendered raw to clinicians (they
 * are mapped through i18n at display time), so scanning them produces noise like
 * `documentTypeId: "medikation"`. Matched case-insensitively against the leaf key.
 */
export const NON_DISPLAY_KEYS = new Set<string>([
  'id',
  'caseid',
  'patientid',
  'democaseid',
  'demopatientid',
  'demoseedversion',
  'demolocale',
  'documenttypeid',
  'selecteddocumenttype',
  'activelabgraphid',
  'activetimelineid',
  'activevariantids',
  'type',
  'documenttype',
  'category',
  'kind',
  'status',
  'changetype',
  'severity',
  'tone',
  'variant',
  'variantid',
  'schemaversion',
  'version',
  'unit',
  'doseunit',
  'code',
  'icd10code',
  'icd11code',
  'atccode',
  'geschlecht',
  'ekg_type',
  'rhythm',
  'st',
  'blocks',
  'conclusion_preset',
  'key',
  'slug',
  'iconname',
  'icon',
  'color',
  'colour',
  'href',
  'url',
  'locale',
  'language',
])

/** A single all-lowercase token (e.g. "medikation", "vidert", "linkstyp"). */
const SINGLE_LOWER_RE = /^[a-z0-9]+$/
/**
 * A multi-segment identifier: alphanumeric segments (any case, so camelCase IDs
 * like `formal_thought_disorder:verlauf:demo-verlauf-01:thoughtForm` qualify)
 * joined by - _ : . / with no whitespace.
 */
const MULTI_SEGMENT_ID_RE = /^[\p{L}\p{N}]+([-_:./][\p{L}\p{N}]+)+$/u

/**
 * True when `value` is a stable internal identifier / enum slug rather than
 * user-facing copy. Identifiers never contain whitespace and never contain
 * umlauts, so anything with an umlaut is always scanned even if it otherwise
 * looks slug-shaped.
 */
function isIdentifierValue(value: string): boolean {
  if (/\s/.test(value)) return false
  if (GERMAN_DIACRITICS.test(value)) return false
  return SINGLE_LOWER_RE.test(value) || MULTI_SEGMENT_ID_RE.test(value)
}

/**
 * Recursively walks an arbitrary JSON-like value and collects every German leak
 * in a *display* string field. Identifier/enum keys ({@link NON_DISPLAY_KEYS})
 * and pure slug values are skipped to avoid false positives on internal IDs.
 */
export function walkStringFields(
  root: unknown,
  options: GermanLeakOptions = {},
): GermanLeakHit[] {
  const hits: GermanLeakHit[] = []

  const visit = (value: unknown, path: string, key: string | null): void => {
    if (typeof value === 'string') {
      if (key && NON_DISPLAY_KEYS.has(key.toLowerCase())) return
      if (isIdentifierValue(value)) return
      const tokens = findGermanTokens(value, options)
      if (tokens.length > 0) hits.push({ path, value, tokens })
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item, idx) => visit(item, `${path}[${idx}]`, key))
      return
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        visit(v, path ? `${path}.${k}` : k, k)
      }
    }
  }

  visit(root, '', null)
  return hits
}

const LOCALE_KEYS = new Set(['de', 'en', 'fr', 'es'])

function isLocaleMap(value: Record<string, unknown>): boolean {
  return typeof value.en === 'string' && typeof value.de === 'string'
}

/**
 * Collects every English (`en`) string from a translation table shaped as nested
 * `{ de, en, fr, es }` locale maps (e.g. `uiTranslations`, `componentTranslations`,
 * `medicationUiTranslations`). For each locale map it records the `en` value and
 * keeps recursing into non-locale child keys (so nested `variants` / `sections`
 * are covered) — but never scans the sibling `de`/`fr`/`es` strings.
 */
export function collectLocaleMapEnglish(root: unknown): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = []

  const visit = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => visit(item, `${path}[${idx}]`))
      return
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      if (isLocaleMap(obj)) {
        out.push({ path: `${path}.en`, value: obj.en as string })
      }
      for (const [k, v] of Object.entries(obj)) {
        if (LOCALE_KEYS.has(k)) continue
        visit(v, path ? `${path}.${k}` : k)
      }
    }
  }

  visit(root, '')
  return out
}

/** Scan a list of `{path, value}` English strings, returning the leaking ones. */
export function scanEnglishValues(
  values: Array<{ path: string; value: string }>,
  options: GermanLeakOptions = {},
): GermanLeakHit[] {
  const hits: GermanLeakHit[] = []
  for (const { path, value } of values) {
    const tokens = findGermanTokens(value, options)
    if (tokens.length > 0) hits.push({ path, value, tokens })
  }
  return hits
}

/** Format hits for a readable assertion message. */
export function formatHits(hits: GermanLeakHit[]): string {
  return hits
    .map((h) => `  • ${h.path}: [${h.tokens.join(', ')}] in "${truncate(h.value)}"`)
    .join('\n')
}

function truncate(value: string, max = 160): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

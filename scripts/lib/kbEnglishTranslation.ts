/**
 * Pure, network-free transform that fills the English (`*En`) localized fields
 * of a Knowledge-Base record (KnowledgeBaseDrug / MedicationMarketAvailability /
 * KnowledgeEntry) from its canonical German content.
 *
 * The transform is deliberately schema-agnostic: it walks the record tree and,
 * for every *known translatable* German field (e.g. `content`, `effect`,
 * `sourceNote`, `tags`), it produces the parallel `*En` sibling (e.g.
 * `contentEn`, `effectEn`, `tagsEn`). This mirrors the `*En` convention defined
 * in `src/types/knowledgeBase.ts` (`pickKbLocalizedText` / `pickKbLocalizedList`)
 * and matches the structure already used by the bundled seed.
 *
 * Why a walker instead of explicit per-field specs: the nested structured
 * payloads (sections → pk / titration / depotOptions / sideEffects / cyp /
 * glance, plus receptorAffinityProfile and legacy receptorProfileDetails) carry
 * the SAME small set of base→`*En` field names at many depths. A single
 * whitelisted walker guarantees the **complete set** is covered with no
 * placeholders, and stays correct as new structured sections are added.
 *
 * The actual LLM (DeepSeek) call is injected as `TranslateBatchFn`, so this
 * module is fully unit-testable with a mock and contains no provider logic.
 */

/**
 * German string fields whose value is user-facing clinical prose and which have
 * a documented `<field>En` sibling in the KB schema. Keys NOT in this set are
 * never translated — in particular `brandNames` (brand names are kept verbatim)
 * and identifiers / enums / numeric payloads.
 *
 * `genericName` and `name` (depot option names) ARE included: they are INN /
 * substance names and must be *normalized* to English INN spelling
 * (Risperidon → Risperidone) rather than translated — the system prompt encodes
 * that rule.
 */
export const KB_TRANSLATABLE_STRING_KEYS: ReadonlySet<string> = new Set([
  // section + entry prose
  'content',
  'label',
  // pharmacokinetics
  'halfLifeNote',
  'note',
  'sourceNote',
  // titration / taper steps
  // (label + note handled above)
  // depot options (descriptive name + dosing prose; `route` is left untranslated
  // — values like "deltoid"/"gluteal"/"oral" are language-neutral and there is
  // no `routeEn` on the preparation schema)
  'name',
  'doseLabel',
  'doseEquivalence',
  'postInjectionMonitoring',
  // side effects
  'effect',
  'system',
  // cyp
  'strength',
  'withDrugOrClass',
  // glance
  'drugClass',
  'halfLifeSummary',
  'pregnancy',
  'lactation',
  // legacy receptor detail
  'clinicalMeaning',
  // top-level drug / preparation descriptive fields
  'category',
  'dosageForm',
  'prescriptionStatus',
  'sourceName',
  'sourceReference',
  'notes',
  // NOTE: `tradeName` / `brandNames` are deliberately excluded — brand/trade
  // names are kept verbatim per the translation rules.
  // INN / substance names (normalized to English INN, not translated)
  'genericName',
  // knowledge entry
  'title',
])

/** German string-array fields with an index-aligned `<field>En` sibling. */
export const KB_TRANSLATABLE_ARRAY_KEYS: ReadonlySet<string> = new Set(['tags'])

/**
 * Keys whose subtree must NOT be walked for translation. These hold English
 * source data, identifiers, or already-localized siblings that would otherwise
 * be mistaken for German source.
 */
const SKIP_SUBTREE_KEYS: ReadonlySet<string> = new Set(['brandNames'])

function isBlank(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

type Slot =
  | {
      kind: 'string'
      id: string
      obj: Record<string, unknown>
      key: string
      enKey: string
      text: string
    }
  | {
      kind: 'array'
      id: string
      obj: Record<string, unknown>
      enKey: string
      items: string[]
    }

/**
 * Collect every translatable slot in the record tree, in deterministic
 * document order. Slot ids are stable structural paths so collection and
 * application agree even when the LLM omits keys.
 */
function collectSlots(root: unknown): Slot[] {
  const slots: Slot[] = []

  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((child, index) => visit(child, `${path}.${index}`))
      return
    }
    if (!node || typeof node !== 'object') return

    const obj = node as Record<string, unknown>
    for (const [key, value] of Object.entries(obj)) {
      if (key.endsWith('En') || SKIP_SUBTREE_KEYS.has(key)) continue
      const childPath = path ? `${path}.${key}` : key

      if (KB_TRANSLATABLE_STRING_KEYS.has(key) && typeof value === 'string') {
        slots.push({
          kind: 'string',
          id: childPath,
          obj,
          key,
          enKey: `${key}En`,
          text: value,
        })
        continue
      }

      if (KB_TRANSLATABLE_ARRAY_KEYS.has(key) && Array.isArray(value)) {
        const items = value.filter((v): v is string => typeof v === 'string')
        if (items.length > 0) {
          slots.push({ kind: 'array', id: childPath, obj, enKey: `${key}En`, items })
        }
        continue
      }

      if (value && typeof value === 'object') visit(value, childPath)
    }
  }

  visit(root, '')
  return slots
}

/** A slot still needing translation (used to build the LLM request). */
export interface PendingTranslation {
  id: string
  text: string
}

/**
 * Returns the flat list of strings still needing an English variant. When
 * `force` is false (default) slots whose `*En` sibling is already populated are
 * skipped, which makes the whole pipeline idempotent / resumable.
 */
export function collectKbTranslations(
  root: unknown,
  opts: { force?: boolean } = {},
): PendingTranslation[] {
  const force = opts.force ?? false
  const out: PendingTranslation[] = []
  for (const slot of collectSlots(root)) {
    if (slot.kind === 'string') {
      if (!slot.text.trim()) continue
      if (!force && !isBlank(slot.obj[slot.enKey])) continue
      out.push({ id: slot.id, text: slot.text })
    } else {
      const existing = slot.obj[slot.enKey]
      if (!force && Array.isArray(existing) && existing.length === slot.items.length) continue
      slot.items.forEach((item, index) => {
        if (item.trim()) out.push({ id: `${slot.id}.${index}`, text: item })
      })
    }
  }
  return out
}

/** Number of translatable strings that still lack an English variant. */
export function countMissingEnglish(root: unknown): number {
  return collectKbTranslations(root, { force: false }).length
}

/**
 * Write translated values back into the record as `*En` siblings. Missing
 * translations leave the existing value untouched (string) or fall back to the
 * German source for that array element (so `tagsEn` is never partially empty).
 * Returns the number of fields actually written.
 */
export function applyKbTranslations(
  root: unknown,
  translated: Record<string, string>,
  opts: { force?: boolean } = {},
): number {
  const force = opts.force ?? false
  let applied = 0
  for (const slot of collectSlots(root)) {
    if (slot.kind === 'string') {
      if (!slot.text.trim()) continue
      if (!force && !isBlank(slot.obj[slot.enKey])) continue
      const value = translated[slot.id]
      if (typeof value === 'string' && value.trim()) {
        slot.obj[slot.enKey] = value.trim()
        applied += 1
      }
    } else {
      const existing = slot.obj[slot.enKey]
      if (!force && Array.isArray(existing) && existing.length === slot.items.length) continue
      let appliedHere = 0
      const result = slot.items.map((item, index) => {
        const value = translated[`${slot.id}.${index}`]
        if (typeof value === 'string' && value.trim()) {
          appliedHere += 1
          return value.trim()
        }
        return item
      })
      if (appliedHere > 0) {
        slot.obj[slot.enKey] = result
        // Count per element so `applied` matches the per-element `requested`.
        applied += appliedHere
      }
    }
  }
  return applied
}

/** Injected translation backend: maps `{id: germanText}` → `{id: englishText}`. */
export type TranslateBatchFn = (
  inputs: Record<string, string>,
) => Promise<Record<string, string>>

export interface TranslateKbItemResult {
  requested: number
  applied: number
  skipped: boolean
}

/**
 * End-to-end translation of a single KB record:
 *   1. collect pending German strings,
 *   2. translate them via the injected backend (DeepSeek in production),
 *   3. write the `*En` siblings back, and
 *   4. stamp machine-translation provenance — WITHOUT touching
 *      `verificationStatus` (the German clinical sign-off is preserved).
 *
 * Mutates `item` in place and returns counts. A record that already has every
 * English field returns `{ skipped: true }` and makes no backend call.
 */
export async function translateKbItem(
  item: Record<string, unknown>,
  translateBatch: TranslateBatchFn,
  opts: { force?: boolean; timestamp?: string } = {},
): Promise<TranslateKbItemResult> {
  const pending = collectKbTranslations(item, { force: opts.force })
  if (pending.length === 0) return { requested: 0, applied: 0, skipped: true }

  const inputs: Record<string, string> = {}
  for (const p of pending) inputs[p.id] = p.text

  const translated = await translateBatch(inputs)
  const applied = applyKbTranslations(item, translated, { force: opts.force })

  if (applied > 0) {
    item.enContentSource = 'machine'
    item.enTranslatedAt = opts.timestamp ?? new Date().toISOString()
  }

  return { requested: pending.length, applied, skipped: false }
}

/**
 * System prompt for the German→English KB translation. Encodes the clinical
 * register and the strict keep-unchanged rules (drug/brand names, receptor &
 * enzyme symbols, lab abbreviations, ICD codes, units, numbers). It is the
 * mirror image of the existing `translate-kb-to-german.ts` prompt.
 */
export const KB_EN_SYSTEM_PROMPT = [
  'You are a professional medical translator localizing a German-first psychiatry clinical knowledge base into English for psychiatrists.',
  'Translate each German clinical text value into precise, natural British/international clinical English, using standard psychopharmacology terminology and a professional clinical register.',
  'STRICT RULES — keep these UNCHANGED (do not translate, expand or alter):',
  '- Receptor, transporter and enzyme symbols (e.g. D2, 5-HT2A, SERT, NET, CYP3A4, CYP2D6, P-gp).',
  '- Standardized lab/medical abbreviations and codes (e.g. HbA1c, QTc, eGFR, ALT, AST, GGT, TSH, CK, BMI, ICD-10 codes such as F20.0).',
  '- Units and numeric values (e.g. 25 mg, 200 mg/day, 5–20 mg, ng/mL, mmol/L, %, hours, weeks).',
  '- Brand / trade names (e.g. Risperdal, Zyprexa, Haldol) — keep verbatim.',
  'For drug / substance / active-ingredient International Nonproprietary Names written in German spelling, return the standard English INN spelling and NOTHING else (e.g. "Risperidon" → "Risperidone", "Quetiapin" → "Quetiapine", "Olanzapin" → "Olanzapine", "Clozapin" → "Clozapine", "Paliperidonpalmitat" → "Paliperidone palmitate"). Do not otherwise translate or describe names.',
  'DO translate: prose, mechanisms, clinical advice, indications, warnings, dosing notes, monitoring rationales, interaction text, side-effect descriptions, population descriptors (e.g. "ältere Patienten" → "elderly patients") and descriptive drug classes (e.g. "Atypisches Antipsychotikum" → "Atypical antipsychotic", "ZNS-dämpfende Substanzen" → "CNS depressants").',
  'Use British/international spelling (e.g. "haemorrhage", "oedema", "diarrhoea", "paediatric").',
  'Preserve any leading/trailing markdown, bullet characters, tables and overall structure of each value.',
  'You will receive a JSON object mapping opaque keys to German strings. Respond with ONLY a JSON object using the EXACT SAME keys, mapping each key to its English translation. Do not add, drop, or rename keys. Do not include commentary.',
  'Example input: {"a":"Mundtrockenheit","b":"Nierenfunktion überwachen"} -> Example output: {"a":"Dry mouth","b":"Monitor renal function"}',
].join('\n')

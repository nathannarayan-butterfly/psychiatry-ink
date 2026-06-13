import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { callLlm } from '../services/llmProvider'

/**
 * Canonical drug-monograph section keys. Mirrors `DrugSectionKey` on the client
 * (minus the `custom` sentinel) so the AI fills exactly the fields the UI knows.
 */
const SECTION_KEYS = [
  'kurzprofil',
  'wirkmechanismus',
  'rezeptorprofil',
  'indikationen',
  'dosierung',
  'nebenwirkungen',
  'kontraindikationen',
  'wechselwirkungen',
  'kontrollen',
  'besonderheiten',
  'umstellung',
  'schwangerschaft',
  'niereLeber',
  'merksaetze',
  'quellen',
] as const

type SectionKey = (typeof SECTION_KEYS)[number]

/** Human-readable hints used to steer the model per section. */
const SECTION_GUIDE: Record<SectionKey, string> = {
  kurzprofil: 'Kurzprofil/Overview: 1–2 Sätze zur Einordnung (Klasse, Hauptindikation).',
  wirkmechanismus: 'Wirkmechanismus: prägnante Beschreibung des pharmakodynamischen Mechanismus.',
  rezeptorprofil: 'Rezeptorprofil: kurze Prosa zu den wichtigsten relativen Rezeptoraffinitäten und deren klinischer Bedeutung (keine 1–5 Scores).',
  indikationen: 'Indikationen: zugelassene und relevante Off-Label-Indikationen als Stichpunkte.',
  dosierung: 'Dosierung: typische Start-/Zieldosen, Titration, Maximaldosis (Erwachsene).',
  nebenwirkungen: 'Nebenwirkungen: häufige und klinisch relevante/gefährliche UAW als Stichpunkte.',
  kontraindikationen: 'Kontraindikationen: absolute und wichtige relative Kontraindikationen.',
  wechselwirkungen: 'Wechselwirkungen: relevante CYP-/pharmakodynamische Interaktionen.',
  kontrollen: 'Kontrollen: Baseline- und Verlaufsmonitoring (Labor, EKG, Spiegel).',
  besonderheiten: 'Besonderheiten: klinisch wichtige Hinweise / Fallstricke.',
  umstellung: 'Umstellung/Depot/Absetzen: Cross-Taper, Depotformulierungen, Absetzschema.',
  schwangerschaft: 'Schwangerschaft/Stillzeit: Risiken und Empfehlungen.',
  niereLeber: 'Niere/Leber: Dosisanpassung bei Nieren-/Leberfunktionsstörung.',
  merksaetze: 'Merksätze/Clinical Pearls: 2–4 kurze, einprägsame Praxistipps.',
  quellen: 'Quellen/References: konkrete Quellen (Fachinformation, S3-Leitlinien, Standardwerke).',
}

/**
 * Default receptor / transporter / enzyme targets for the v2 relative
 * receptor-affinity model. The model only emits the targets that are relevant
 * for a given drug — it is NOT required to fill every axis.
 */
const RECEPTOR_TARGETS = [
  'D2',
  'D3',
  'D1',
  '5-HT2A',
  '5-HT2C',
  '5-HT1A',
  'H1',
  'M1',
  'α1',
  'α2',
  'SERT',
  'NET',
  'DAT',
] as const

const RECEPTOR_ACTIONS = [
  'antagonist',
  'partial_agonist',
  'agonist',
  'inverse_agonist',
  'reuptake_inhibitor',
  'enzyme_inhibitor',
  'mixed',
  'unknown',
] as const
type ReceptorActionV2 = (typeof RECEPTOR_ACTIONS)[number]

const EVIDENCE_QUALITIES = ['high', 'moderate', 'low', 'estimated', 'unknown'] as const
type EvidenceQualityV2 = (typeof EVIDENCE_QUALITIES)[number]

const CLINICAL_RELEVANCES = ['high', 'moderate', 'low', 'uncertain'] as const
type ClinicalRelevanceV2 = (typeof CLINICAL_RELEVANCES)[number]

const RECEPTOR_PROFILE_VERSION = 2 as const
const AFFINITY_SCALE = 'relative_log_ki_percent' as const

/** A single validated v2 receptor-affinity entry. */
interface ReceptorAffinityEntryV2 {
  target: string
  affinityPercent: number | null
  rawKiNm?: number | null
  rawIc50Nm?: number | null
  pKi?: number | null
  action: ReceptorActionV2
  clinicalRelevance?: ClinicalRelevanceV2
  evidenceQuality: EvidenceQualityV2
  sourceNote?: string
  isEstimated?: boolean
}

const STRONG_KI_NM = 0.1
const WEAK_KI_NM = 10000
const LOG_WEAK = Math.log10(WEAK_KI_NM)
const LOG_RANGE = LOG_WEAK - Math.log10(STRONG_KI_NM)

function kiToAffinityPercent(rawKiNm: number): number {
  if (!Number.isFinite(rawKiNm) || rawKiNm <= 0) return 0
  const pct = ((LOG_WEAK - Math.log10(rawKiNm)) / LOG_RANGE) * 100
  return Math.round(Math.max(0, Math.min(100, pct)))
}

export interface PharmaGenerateRequestBody {
  genericName: string
  brandNames?: string[]
  drugClass?: string
  category?: string
  /** Subset of section keys to fill; omit / empty → all sections. */
  sections?: string[]
  /** Optional model tier; defaults to `thorough` (OpenAI primary). */
  tier?: AiModelTier
  /** UI language for the generated content; defaults to German. */
  language?: 'de' | 'en' | 'fr' | 'es'
}

export interface PharmaGenerateResponseBody {
  sections: Partial<Record<SectionKey, string>>
  /** v2 relative receptor-affinity profile (validated). */
  receptorProfileVersion: typeof RECEPTOR_PROFILE_VERSION
  affinityScale: typeof AFFINITY_SCALE
  receptorAffinityProfile: ReceptorAffinityEntryV2[]
  /**
   * True when the model returned a deprecated 1–5 score map; the legacy data is
   * NOT used as a scientific profile and the entry should be regenerated.
   */
  legacyScoreProfileDetected?: boolean
  references: string[]
  model: { provider: string; modelId: string; label: string }
}

export const pharmaGenerateRouter: Router = createRouter()

const MAX_NAME_CHARS = 400
const VALID_TIERS: AiModelTier[] = ['fast', 'standard', 'thorough']

function sanitizeStringList(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max)
}

function resolveLanguageName(lang: string | undefined): string {
  switch (lang) {
    case 'en':
      return 'English'
    case 'fr':
      return 'French'
    case 'es':
      return 'Spanish'
    default:
      return 'German'
  }
}

function buildSystemPrompt(): string {
  return [
    'You are a clinical pharmacology expert assistant. You generate concise, accurate psychiatric drug monographs for clinician reference.',
    'Audience: psychiatrists and clinical staff. Be compact and clinically useful: short bullet points or brief paragraphs per section.',
    'Be accurate and conservative. If you are uncertain about a fact, explicitly mark it as uncertain (e.g. "unsicher" / "ggf. prüfen") rather than inventing specifics.',
    'Never invent precise numeric values (doses, levels, Ki/IC50) you are not confident about; prefer estimates clearly flagged as such.',
    'Receptor data uses a RELATIVE AFFINITY INDEX (0–100), NOT a 1–5 score, NOT receptor occupancy, NOT clinical blockade. Never output a 1–5 receptor scale.',
    'ALWAYS provide a "quellen" (references) section and a structured "references" array citing standard sources such as the Fachinformation (SmPC), S3-Leitlinien, AMDP, and recognised psychopharmacology references. These references are AI-suggested and MUST be verified against official sources by the clinician.',
    'Output STRICT JSON only — no markdown, no commentary, no code fences.',
  ].join(' ')
}

function buildUserPrompt(body: PharmaGenerateRequestBody, targetSections: SectionKey[]): string {
  const languageName = resolveLanguageName(body.language)
  const brands = (body.brandNames ?? []).join(', ')
  const sectionLines = targetSections.map((key) => `- "${key}": ${SECTION_GUIDE[key]}`).join('\n')

  return [
    `Generate a psychiatric drug monograph in ${languageName} for the following drug.`,
    '',
    `Generic name: ${body.genericName}`,
    brands ? `Brand names: ${brands}` : 'Brand names: (unknown)',
    body.drugClass ? `Drug class: ${body.drugClass}` : 'Drug class: (unknown)',
    body.category ? `Category: ${body.category}` : 'Category: (unknown)',
    '',
    'Fill the following sections. For each, return a single string value (use line breaks / "•" bullets where helpful):',
    sectionLines,
    '',
    '── RECEPTOR AFFINITY (v2 model) ──',
    'ALSO return a "receptorAffinityProfile" array describing the drug\'s relative receptor / transporter / enzyme binding.',
    'CRITICAL DEFINITION: "affinityPercent" is a RELATIVE RECEPTOR AFFINITY INDEX (0–100) — a normalized comparison of binding strength.',
    'It is NOT receptor occupancy, NOT dose-dependent clinical blockade, and NOT clinical effect strength. Do NOT use a 1–5 score.',
    'Do NOT invent precise Ki values. If a binding constant is not confidently known, set rawKiNm:null, rawIc50Nm:null, pKi:null and provide an estimated affinityPercent with isEstimated:true and evidenceQuality "estimated" or "low".',
    'When a Ki/IC50/pKi IS well established from standard pharmacology references, include it (rawKiNm/rawIc50Nm in nanomolar, pKi as −log10 Ki[M]) and set isEstimated:false with a higher evidenceQuality.',
    'Only include targets that are clinically relevant for this drug. Suggested target symbols: ' + RECEPTOR_TARGETS.join(', ') + ' (others allowed, e.g. 5-HT7, D4, M3).',
    'Each entry fields: target (string), action (one of: ' + RECEPTOR_ACTIONS.join(', ') + '), affinityPercent (0–100 or null), rawKiNm (number|null), rawIc50Nm (number|null), pKi (number|null), evidenceQuality (one of: ' + EVIDENCE_QUALITIES.join(', ') + '), clinicalRelevance (one of: ' + CLINICAL_RELEVANCES.join(', ') + '), isEstimated (boolean), sourceNote (short string).',
    '',
    'Also return a "references" array of short citation strings (these are AI-suggested and must be verified).',
    '',
    'Respond with STRICT JSON of exactly this shape (no extra keys, no markdown, NO 1–5 scores):',
    '{',
    '  "sections": { "<sectionKey>": "<content string>", ... },',
    '  "receptorAffinityProfile": [',
    '    { "target": "D2", "action": "antagonist", "affinityPercent": 92, "rawKiNm": 1.2, "rawIc50Nm": null, "pKi": 8.9, "evidenceQuality": "high", "clinicalRelevance": "high", "isEstimated": false, "sourceNote": "…" }',
    '  ],',
    '  "references": ["<citation>", ...]',
    '}',
  ].join('\n')
}

/** Strip optional ```json fences and parse, tolerating minor wrapping. */
function parseModelJson(raw: string): {
  sections?: Record<string, unknown>
  receptorAffinityProfile?: unknown
  /** Deprecated 1–5 map; detected only to flag legacy output. */
  receptorProfile?: Record<string, unknown>
  references?: unknown
} | null {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  }
  // Fall back to the outermost JSON object if the model added prose.
  if (!text.startsWith('{')) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) text = text.slice(start, end + 1)
  }
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function coerceSections(
  rawSections: Record<string, unknown> | undefined,
  targetSections: SectionKey[],
): Partial<Record<SectionKey, string>> {
  const out: Partial<Record<SectionKey, string>> = {}
  if (!rawSections) return out
  for (const key of targetSections) {
    const value = rawSections[key]
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim()
    } else if (Array.isArray(value)) {
      const joined = value.filter((v) => typeof v === 'string').join('\n')
      if (joined.trim()) out[key] = joined.trim()
    }
  }
  return out
}

function toPercentOrNull(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return null
  return Math.round(Math.max(0, Math.min(100, num)))
}

function toPositiveOrNull(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) && num > 0 ? num : null
}

function toFiniteOrNull(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

/**
 * Strictly validate the model's v2 receptor-affinity array. Invalid entries are
 * dropped (logged in dev); out-of-range numerics are coerced to null so
 * malformed data is never returned to the client.
 */
function coerceAffinityProfile(raw: unknown): ReceptorAffinityEntryV2[] {
  if (!Array.isArray(raw)) return []
  const out: ReceptorAffinityEntryV2[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const target = typeof r.target === 'string' ? r.target.trim() : ''
    if (!target) continue

    const action: ReceptorActionV2 = RECEPTOR_ACTIONS.includes(r.action as ReceptorActionV2)
      ? (r.action as ReceptorActionV2)
      : 'unknown'
    const evidenceQuality: EvidenceQualityV2 = EVIDENCE_QUALITIES.includes(
      r.evidenceQuality as EvidenceQualityV2,
    )
      ? (r.evidenceQuality as EvidenceQualityV2)
      : 'unknown'

    const rawKiNm = toPositiveOrNull(r.rawKiNm)
    const rawIc50Nm = toPositiveOrNull(r.rawIc50Nm)
    const pKi = toFiniteOrNull(r.pKi)
    let affinityPercent = toPercentOrNull(r.affinityPercent)
    if (affinityPercent == null && rawKiNm != null) affinityPercent = kiToAffinityPercent(rawKiNm)

    const isEstimated =
      typeof r.isEstimated === 'boolean'
        ? r.isEstimated
        : evidenceQuality === 'estimated' || (rawKiNm == null && rawIc50Nm == null && pKi == null)

    const entry: ReceptorAffinityEntryV2 = {
      target,
      affinityPercent,
      rawKiNm,
      rawIc50Nm,
      pKi,
      action,
      evidenceQuality,
      isEstimated,
    }
    if (CLINICAL_RELEVANCES.includes(r.clinicalRelevance as ClinicalRelevanceV2)) {
      entry.clinicalRelevance = r.clinicalRelevance as ClinicalRelevanceV2
    }
    if (typeof r.sourceNote === 'string' && r.sourceNote.trim()) {
      entry.sourceNote = r.sourceNote.trim().slice(0, 400)
    }
    out.push(entry)
  }
  return out
}

pharmaGenerateRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as PharmaGenerateRequestBody

    const genericName = typeof body.genericName === 'string' ? body.genericName.trim() : ''
    if (!genericName) {
      res.status(400).json({ error: 'Missing genericName' })
      return
    }
    if (genericName.length > MAX_NAME_CHARS) {
      res.status(413).json({ error: 'genericName too large' })
      return
    }

    const tier: AiModelTier = VALID_TIERS.includes(body.tier as AiModelTier)
      ? (body.tier as AiModelTier)
      : 'thorough'

    const requested = sanitizeStringList(body.sections)
    const targetSections: SectionKey[] = requested.length
      ? SECTION_KEYS.filter((k) => requested.includes(k))
      : [...SECTION_KEYS]
    const effectiveSections = targetSections.length ? targetSections : [...SECTION_KEYS]

    const normalizedBody: PharmaGenerateRequestBody = {
      genericName,
      brandNames: sanitizeStringList(body.brandNames),
      drugClass: typeof body.drugClass === 'string' ? body.drugClass.trim().slice(0, MAX_NAME_CHARS) : '',
      category: typeof body.category === 'string' ? body.category.trim().slice(0, MAX_NAME_CHARS) : '',
      language: body.language,
    }

    const result = await callLlm({
      tier,
      systemPrompt: buildSystemPrompt(),
      userPrompt: buildUserPrompt(normalizedBody, effectiveSections),
    })

    const parsed = parseModelJson(result.text)
    if (!parsed) {
      // Model returned non-JSON (e.g. mock mode without an API key).
      res.status(502).json({ error: 'AI returned an unparseable response' })
      return
    }

    const sections = coerceSections(parsed.sections, effectiveSections)
    const receptorAffinityProfile = coerceAffinityProfile(parsed.receptorAffinityProfile)
    // Detect deprecated 1–5 score output: flag it but never use it as a profile.
    const legacyScoreProfileDetected =
      parsed.receptorProfile != null &&
      typeof parsed.receptorProfile === 'object' &&
      Object.keys(parsed.receptorProfile).length > 0
    if (legacyScoreProfileDetected) {
      console.warn('[pharma-generate] model returned deprecated 1–5 receptorProfile; ignored')
    }
    const references = sanitizeStringList(parsed.references, 30)

    // Mirror references into the quellen section if the model left it empty.
    if (!sections.quellen && references.length && effectiveSections.includes('quellen')) {
      sections.quellen = references.map((r) => `• ${r}`).join('\n')
    }

    const responseBody: PharmaGenerateResponseBody = {
      sections,
      receptorProfileVersion: RECEPTOR_PROFILE_VERSION,
      affinityScale: AFFINITY_SCALE,
      receptorAffinityProfile,
      legacyScoreProfileDetected,
      references,
      model: result.model,
    }
    res.json(responseBody)
  } catch (error) {
    console.error('[pharma-generate] failed:', error)
    res.status(500).json({ error: 'Generation failed' })
  }
})

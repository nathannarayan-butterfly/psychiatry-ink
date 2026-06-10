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
  rezeptorprofil: 'Rezeptorprofil: kurze Prosa zu den wichtigsten Rezeptoraffinitäten und deren klinischer Bedeutung.',
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

/** Receptors expected for the receptor-scoring feature (0–5 strength scale). */
const RECEPTOR_KEYS = [
  'D2',
  'D3',
  '5-HT2A',
  '5-HT1A',
  '5-HT2C',
  'H1',
  'M1',
  'alpha1',
  'alpha2',
  'SERT',
  'NET',
  'DAT',
] as const

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
  /** Optional receptor-strength map (0–5) when the model can provide one. */
  receptorProfile?: Record<string, number>
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
    'Never invent precise numeric values (doses, levels) you are not confident about; prefer typical ranges and flag them.',
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
    'For "rezeptorprofil" ALSO return a "receptorProfile" object mapping receptor → integer strength 0–5',
    '(0 none, 1 negligible, 2 mild, 3 moderate, 4 strong, 5 dominant). Use these receptor keys when relevant:',
    RECEPTOR_KEYS.join(', '),
    'Omit receptors that do not apply. If you cannot assess the receptor profile, return an empty object.',
    '',
    'Also return a "references" array of short citation strings (these are AI-suggested and must be verified).',
    '',
    'Respond with STRICT JSON of exactly this shape (no extra keys, no markdown):',
    '{',
    '  "sections": { "<sectionKey>": "<content string>", ... },',
    '  "receptorProfile": { "D2": 3, ... },',
    '  "references": ["<citation>", ...]',
    '}',
  ].join('\n')
}

/** Strip optional ```json fences and parse, tolerating minor wrapping. */
function parseModelJson(raw: string): {
  sections?: Record<string, unknown>
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

function coerceReceptorProfile(raw: Record<string, unknown> | undefined): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    const num = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(num)) {
      out[key] = Math.max(0, Math.min(5, Math.round(num)))
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
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
    const receptorProfile = coerceReceptorProfile(parsed.receptorProfile)
    const references = sanitizeStringList(parsed.references, 30)

    // Mirror references into the quellen section if the model left it empty.
    if (!sections.quellen && references.length && effectiveSections.includes('quellen')) {
      sections.quellen = references.map((r) => `• ${r}`).join('\n')
    }

    const responseBody: PharmaGenerateResponseBody = {
      sections,
      receptorProfile,
      references,
      model: result.model,
    }
    res.json(responseBody)
  } catch (error) {
    console.error('[pharma-generate] failed:', error)
    res.status(500).json({ error: 'Generation failed' })
  }
})

import type { AiModelTier } from '../modelTierMapping'
import {
  clinicalLanguagePromptInstruction,
  type ClinicalLanguage,
} from '../utils/resolveClinicalLanguage'
import { llmResultModel } from './safeLlmEgress'
import { runAiFeature } from '../ai/runAiFeature'
import { parseStructuredJson } from '../utils/parseStructuredJson'
import type { AiUsageContext } from '../ai/types'
import type { PrepAiCheckPreparation } from '../../src/types/prepAiCheck'
import {
  PRESCRIBING_COUNTRY_CODES,
  type PrescribingCountryCode,
} from '../../src/types/knowledgeBase'

const VALID_COUNTRIES: readonly PrescribingCountryCode[] = PRESCRIBING_COUNTRY_CODES

const DEFAULT_DISCLAIMER_DE =
  'KI-generierte Marktübersicht — nicht Echtzeit-Gelbe-Liste. Klinisch verifizieren.'

function coerceString(value: unknown, max = 300): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function sanitizePreparations(raw: unknown): PrepAiCheckPreparation[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): PrepAiCheckPreparation | null => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const brandName = coerceString(r.brandName ?? r.tradeName, 160)
      const strength = coerceString(r.strength ?? r.strengthValue, 80)
      const form = coerceString(r.form ?? r.dosageForm, 120)
      if (!brandName || !strength || !form) return null
      const pzn = coerceString(r.pzn ?? r.productIdentifier, 20) || undefined
      const availabilityNote = coerceString(r.availabilityNote ?? r.notes, 200) || undefined
      const sourceHint = coerceString(r.sourceHint ?? r.sourceName, 120) || undefined
      return { brandName, strength, form, pzn, availabilityNote, sourceHint }
    })
    .filter((entry): entry is PrepAiCheckPreparation => entry != null)
    .slice(0, 24)
}

/**
 * National medicines-agency / formulary hints per country, used to ground the
 * AI market-overview prompt in country-appropriate sources. None are live APIs.
 * Countries without a specific entry fall back to the national authority + EMA
 * (EU central register) so newly-added markets are never silently treated as
 * Germany.
 */
const COUNTRY_RESOURCES: Partial<Record<PrescribingCountryCode, string>> = {
  DE: 'Gelbe Liste, Fachinformation (SmPC), ABDA/IFA, BfArM — keine Live-API',
  AT: 'BASG/AGES, Austria-Codex, Pharmazentralnummer — keine Live-API',
  CH: 'Swissmedic, Compendium.ch, Hausapotheke — keine Live-API',
  LI: 'Swissmedic / Compendium.ch (Schweizer Markt via Zollvertrag) — keine Live-API',
  BE: 'AFMPS/FAGG, CBIP/BCFI — keine Live-API',
  BG: 'Bulgarian Drug Agency (BDA) — keine Live-API',
  HR: 'HALMED — keine Live-API',
  CY: 'Pharmaceutical Services (MoH Cyprus), EMA — keine Live-API',
  CZ: 'SÚKL — keine Live-API',
  DK: 'Lægemiddelstyrelsen (DKMA), pro.medicin.dk — keine Live-API',
  EE: 'Ravimiamet (State Agency of Medicines) — keine Live-API',
  FI: 'Fimea, Pharmaca Fennica — keine Live-API',
  FR: 'ANSM, base de données publique des médicaments, Vidal — keine Live-API',
  GR: 'EOF (National Organization for Medicines) — keine Live-API',
  HU: 'OGYÉI — keine Live-API',
  IS: 'Lyfjastofnun (Icelandic Medicines Agency) — keine Live-API',
  IE: 'HPRA, MIMS Ireland — keine Live-API',
  IT: 'AIFA, banca dati farmaci — keine Live-API',
  LV: 'State Agency of Medicines (Zāļu valsts aģentūra) — keine Live-API',
  LT: 'State Medicines Control Agency (VVKT) — keine Live-API',
  LU: 'Ministère de la Santé; BE/FR/DE-Markt, EMA — keine Live-API',
  MT: 'Medicines Authority Malta, EMA — keine Live-API',
  NL: 'CBG-MEB, Farmacotherapeutisch Kompas — keine Live-API',
  NO: 'DMP (Norwegian Medical Products Agency), Felleskatalogen — keine Live-API',
  PL: 'URPL, Rejestr Produktów Leczniczych — keine Live-API',
  PT: 'INFARMED, Prontuário Terapêutico — keine Live-API',
  RO: 'ANMDMR — keine Live-API',
  SK: 'ŠÚKL — keine Live-API',
  SI: 'JAZMP — keine Live-API',
  ES: 'AEMPS, CIMA — keine Live-API',
  SE: 'Läkemedelsverket, FASS — keine Live-API',
  UK: 'BNF, MHRA, emc — keine Live-API',
  US: 'FDA, DailyMed, Orange Book — keine Live-API',
  CA: 'Health Canada Drug Product Database, CPS — keine Live-API',
  AU: 'TGA, Australian Medicines Handbook (AMH) — keine Live-API',
  NZ: 'Medsafe, New Zealand Formulary (NZF) — keine Live-API',
}

/** English country name for prompts (Node ships `Intl.DisplayNames`). */
function countryDisplayName(country: PrescribingCountryCode): string {
  const iso = country === 'UK' ? 'GB' : country
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(iso)
    if (name && name !== iso) return name
  } catch {
    // fall through to the raw code
  }
  return iso
}

function countryResources(country: PrescribingCountryCode): string {
  const mapped = COUNTRY_RESOURCES[country]
  if (mapped) return mapped
  // Arbitrary market without a hand-mapped agency: ground the model in that
  // country's own regulator plus EMA/WHO references — never default to Germany.
  const name = countryDisplayName(country)
  return `the national medicines regulatory authority of ${name}, plus EMA (EU) and WHO references — no live API`
}

export async function assessPreparationAvailabilityWithAi(params: {
  substance: string
  genericName?: string
  country: PrescribingCountryCode
  selectedDrug?: { substance: string; strength?: string; formulation?: string }
  kbPreparations?: Array<{ tradeName: string; strength: string; form: string }>
  tier?: AiModelTier
  language: ClinicalLanguage
  usageContext?: AiUsageContext
}): Promise<{
  preparations: PrepAiCheckPreparation[]
  disclaimer: string
  country: PrescribingCountryCode
  model: { provider: string; modelId: string; label: string }
}> {
  const country = VALID_COUNTRIES.includes(params.country) ? params.country : 'DE'
  const language = params.language
  const generic = (params.genericName ?? params.substance).trim()
  const resources = countryResources(country)
  const countryLabel = `${countryDisplayName(country)} (${country})`

  const kbBlock =
    params.kbPreparations && params.kbPreparations.length > 0
      ? `\nBereits in interner Wissensdatenbank verifiziert (nicht wiederholen, nur ergänzen):\n${params.kbPreparations
          .map((p) => `- ${p.tradeName} · ${p.strength} · ${p.form}`)
          .join('\n')}`
      : ''

  const planBlock = params.selectedDrug
    ? `\nIm Therapieplan gewählt: ${params.selectedDrug.substance}${
        params.selectedDrug.strength ? ` · ${params.selectedDrug.strength}` : ''
      }${params.selectedDrug.formulation ? ` · ${params.selectedDrug.formulation}` : ''}`
    : ''

  const systemPrompt = [
    'Du bist ein klinisch-pharmakologischer Assistent für Psychiatrie.',
    `Erstelle eine kompakte Übersicht marktgängiger Fertigarzneimittel für ${countryLabel}.`,
    `Nutze typisches Fachwissen zu ${resources}.`,
    'Du hast KEINEN Live-Zugriff auf Gelbe Liste oder andere Register — kennzeichne Unsicherheit.',
    clinicalLanguagePromptInstruction(language),
    'Antworte NUR als valides JSON-Objekt ohne Markdown.',
    'Felder: preparations (Array), disclaimer (string), country (string).',
    'Jedes preparations-Element: brandName, strength, form, pzn (optional), availabilityNote (optional), sourceHint (optional).',
    'availabilityNote: kurzer Hinweis zu Verfügbarkeit/Rezeptstatus/Unsicherheit.',
    'sourceHint: z.B. "Gelbe Liste (Referenz)", "Fachinfo", "typ. Markt DE".',
    'Maximal 20 Einträge, psychiatrisch relevante Stärken/Formen priorisieren.',
    `disclaimer muss enthalten, dass dies keine Echtzeit-Gelbe-Liste ist.`,
  ].join(' ')

  const userPrompt = [
    `Wirkstoff/Substanz: ${params.substance.trim()}`,
    generic !== params.substance.trim() ? `Generischer Name: ${generic}` : '',
    `Land: ${countryLabel}`,
    planBlock,
    kbBlock,
    '',
    'JSON-Beispiel:',
    '{"preparations":[{"brandName":"Risperdal","strength":"2 mg","form":"Filmtabletten","pzn":"","availabilityNote":"Marktgängig, Rezeptpflichtig","sourceHint":"typ. Markt DE"}],"disclaimer":"…","country":"DE"}',
  ]
    .filter(Boolean)
    .join('\n')

  const result = await runAiFeature({
    featureKey: 'prep_ai_check',
    tier: params.tier ?? 'standard',
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: 4000,
    usageContext: {
      featureKey: 'prep_ai_check',
      ...params.usageContext,
      metadata: { ...params.usageContext?.metadata, country },
    },
  })

  const parsed = parseStructuredJson(result.text) as Record<string, unknown> | null
  const preparations = sanitizePreparations(parsed?.preparations)
  const disclaimer =
    coerceString(parsed?.disclaimer, 400) ||
    DEFAULT_DISCLAIMER_DE

  return {
    preparations,
    disclaimer,
    country,
    model: llmResultModel(result),
  }
}

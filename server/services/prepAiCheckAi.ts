import type { AiModelTier } from '../modelTierMapping'
import {
  clinicalLanguagePromptInstruction,
  type ClinicalLanguage,
} from '../utils/resolveClinicalLanguage'
import { callLlm } from './llmProvider'
import { parseStructuredJson } from '../utils/parseStructuredJson'
import type { PrepAiCheckPreparation } from '../../src/types/prepAiCheck'
import type { PrescribingCountryCode } from '../../src/types/knowledgeBase'

const VALID_COUNTRIES: PrescribingCountryCode[] = ['DE', 'CH', 'AT', 'UK']

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

function countryResources(country: PrescribingCountryCode): string {
  switch (country) {
    case 'CH':
      return 'Swissmedic, Compendium.ch, Hausapotheke — keine Live-API'
    case 'AT':
      return 'Basg.gv.at, Pharmazentralnummer — keine Live-API'
    case 'UK':
      return 'BNF, MHRA, emc — keine Live-API'
    default:
      return 'Gelbe Liste, Fachinformation (SmPC), ABDA/IFA — keine Live-API'
  }
}

export async function assessPreparationAvailabilityWithAi(params: {
  substance: string
  genericName?: string
  country: PrescribingCountryCode
  selectedDrug?: { substance: string; strength?: string; formulation?: string }
  kbPreparations?: Array<{ tradeName: string; strength: string; form: string }>
  tier?: AiModelTier
  language: ClinicalLanguage
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
    `Erstelle eine kompakte Übersicht marktgängiger Fertigarzneimittel für ${country}.`,
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
    `Land: ${country}`,
    planBlock,
    kbBlock,
    '',
    'JSON-Beispiel:',
    '{"preparations":[{"brandName":"Risperdal","strength":"2 mg","form":"Filmtabletten","pzn":"","availabilityNote":"Marktgängig, Rezeptpflichtig","sourceHint":"typ. Markt DE"}],"disclaimer":"…","country":"DE"}',
  ]
    .filter(Boolean)
    .join('\n')

  const result = await callLlm({
    tier: params.tier ?? 'standard',
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: 4000,
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
    model: result.model,
  }
}
